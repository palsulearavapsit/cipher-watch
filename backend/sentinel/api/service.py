"""SentinelService: owns the live pipeline and fans verdicts out to clients.

Lifecycle: warm up per-entity baselines, then run the engine consumer + real-time
simulator loops (transaction, UPI, blockchain). Every verdict is broadcast over
WebSocket; anomalies are also written to Firestore via FirebaseSink.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

from ..core.bus import EventBus
from ..core.events import NormalizedEvent
from ..engine import AnomalyEngine
from ..explain import Explainer, GeminiClient
from ..sim import TrafficSimulator, default_profiles
from ..sim.simulator import ATTACK_BURST_DEFAULT
from ..adapters.upi import UPISimulator
from ..adapters.blockchain import EtherscanPoller, BlockchainSimulator
from ..sinks import FirebaseSink

logger = logging.getLogger(__name__)


class SentinelService:
    def __init__(
        self,
        seed: int = 1337,
        tick_interval: float = 0.25,
        warmup_minutes: int = 20,
        use_gemini: bool = False,
    ) -> None:
        self._bus = EventBus()
        self._engine = AnomalyEngine()

        gemini = GeminiClient(api_key=os.environ.get("GEMINI_API_KEY"))
        self._explainer = Explainer(gemini=gemini, use_gemini=use_gemini)

        self._sim = TrafficSimulator(self._bus, seed=seed)
        self._upi_sim = UPISimulator(seed=seed + 1)
        self._blockchain_sim = BlockchainSimulator(seed=seed + 2)

        self._firebase = FirebaseSink()

        # Etherscan live poller — only if credentials present
        etherscan_key = os.environ.get("ETHERSCAN_API_KEY", "")
        watched_raw = os.environ.get("WATCHED_WALLETS", os.environ.get("WATCHED_WALLET", ""))
        watched = [w.strip() for w in watched_raw.split(",") if w.strip()]
        self._etherscan: Optional[EtherscanPoller] = (
            EtherscanPoller(
                on_event=self._on_raw_event,
                api_key=etherscan_key,
                wallets=watched,
            )
            if etherscan_key and watched
            else None
        )

        self._clients: set = set()
        self._tick = tick_interval
        self._warmup_minutes = warmup_minutes
        self._consumer: Optional[asyncio.Task] = None
        self._sim_task: Optional[asyncio.Task] = None
        self._upi_task: Optional[asyncio.Task] = None
        self._blockchain_task: Optional[asyncio.Task] = None

    # ── introspection ──────────────────────────────────────────────────────────

    def entities(self) -> list[str]:
        return [p.entity_id for p in default_profiles()]

    @property
    def client_count(self) -> int:
        return len(self._clients)

    @property
    def firebase_enabled(self) -> bool:
        return self._firebase.enabled

    # ── client registry ────────────────────────────────────────────────────────

    def add_client(self, ws) -> None:
        self._clients.add(ws)

    def remove_client(self, ws) -> None:
        self._clients.discard(ws)

    # ── attack injection ───────────────────────────────────────────────────────

    def inject(self, kind: str, entity_id: str, burst: int = ATTACK_BURST_DEFAULT) -> None:
        self._sim.inject_attack(kind, entity_id, burst)

    def inject_upi_attack(self) -> None:
        """Inject a UPI fraud burst (high-value transfer to unknown payee)."""
        for _ in range(15):
            event = self._upi_sim.next_event(attack=True)
            asyncio.create_task(self._on_raw_event(event))

    def inject_blockchain_attack(self) -> None:
        """Inject a blockchain anomaly (large ETH transfer to contract)."""
        for _ in range(10):
            event = self._blockchain_sim.next_event(attack=True)
            asyncio.create_task(self._on_raw_event(event))

    # ── lifecycle ──────────────────────────────────────────────────────────────

    async def warmup(self) -> int:
        sub = self._bus.subscribe(maxsize=200000)
        emitted = await self._sim.warmup(self._warmup_minutes)
        for _ in range(emitted):
            self._engine.process(await sub.get())
        sub.close()
        return emitted

    async def start(self) -> None:
        await self.warmup()
        await self._warmup_upi()
        await self._warmup_blockchain()
        await self._warmup_database()
        self._consumer = self._engine.start(self._bus, self._on_verdict)
        if self._etherscan:
            self._etherscan.start()
        logger.info(
            "SentinelService started | firebase=%s | etherscan=%s | mode=user-driven",
            self._firebase.enabled,
            self._etherscan is not None,
        )

    async def _warmup_upi(self) -> None:
        """Seed UPI baselines with normal traffic so anomalies are detectable."""
        import random as _random
        rng = _random.Random(42)
        vpas = ["rohit.sharma@okicici", "priya.v@paytm", "karan91@ybl", "sunita.k@okhdfc"]
        known_payees = ["merchant.zomato@hdfcbank", "amazon.pay@apl", "flipkart.uat@ybl"]
        for _ in range(200):
            vpa = rng.choice(vpas)
            raw = {
                "vpa": vpa,
                "payee_vpa": rng.choice(known_payees),
                "amount_inr": rng.uniform(100, 5000),
                "count_in_window": rng.randint(1, 5),
            }
            event = self._upi_sim._adapter.normalize(raw)
            self._engine.process(event)
        logger.info("UPI warmup: 200 normal transactions seeded")

    async def _warmup_blockchain(self) -> None:
        """Seed blockchain baselines with normal wallet activity."""
        import random as _random
        rng = _random.Random(99)
        for _ in range(150):
            event = self._blockchain_sim.next_event(attack=False)
            self._engine.process(event)
        logger.info("Blockchain warmup: 150 normal transactions seeded")

    async def _warmup_database(self) -> None:
        """Seed DB baselines for common entity IDs so anomalies are detectable."""
        from ..adapters.database import DatabaseAdapter
        import random as _random
        rng = _random.Random(77)
        adapter = DatabaseAdapter()
        users = ["user_1", "user_2", "user_3", "admin", "svc_billing",
                 "svc_payments", "analyst", "developer", "service_account"]
        tables = ["users", "payments", "orders", "transactions", "logs"]
        # First guarantee MIN_SAMPLES for every entity (deterministic)
        for user in users:
            for _ in range(15):
                raw = {
                    "user_id": user,
                    "write_count": rng.randint(1, 6),
                    "delete_count": rng.randint(0, 2),
                    "table": rng.choice(tables),
                }
                self._engine.process(adapter.normalize(raw))
        # Then add variety across the distribution
        for _ in range(200):
            raw = {
                "user_id": rng.choice(users),
                "write_count": rng.randint(1, 6),
                "delete_count": rng.randint(0, 2),
                "table": rng.choice(tables),
            }
            self._engine.process(adapter.normalize(raw))
        logger.info("Database warmup: %d entities seeded", len(users))

    def analyze_now(self, event) -> dict:
        """Synchronously analyze a single event and return the full verdict."""
        verdict = self._engine.process(event)
        explanation_text = None
        if verdict.is_anomaly:
            explanation = self._explainer.explain(verdict)
            explanation_text = explanation.text if explanation else None
            self._firebase.push(verdict, explanation_text)
            if verdict.source == "blockchain":
                value_eth = next((f.value for f in verdict.tripped_features if f.name == "value_eth"), 0)
                self._firebase.push_wallet_activity(
                    wallet=verdict.entity_id,
                    amount_eth=float(value_eth) if isinstance(value_eth, (int, float)) else 0.0,
                    is_flagged=True,
                )
        payload = verdict.to_dict()
        payload["explanation"] = explanation_text
        return payload

    async def stop(self) -> None:
        if self._etherscan:
            self._etherscan.stop()
        for task in (self._consumer, self._sim_task, self._upi_task, self._blockchain_task):
            if task is not None:
                task.cancel()

    async def pump(self, steps: int) -> None:
        sub = self._bus.subscribe(maxsize=200000)
        await self._sim.run_normal(steps)
        for _ in range(steps):
            await self._on_verdict(self._engine.process(await sub.get()))
        sub.close()

    # ── simulation loops ───────────────────────────────────────────────────────

    async def _sim_loop(self) -> None:
        try:
            while True:
                await self._sim.run_normal(1)
                await asyncio.sleep(self._tick)
        except asyncio.CancelledError:
            pass

    async def _upi_loop(self) -> None:
        """Generate realistic UPI traffic between real sim ticks."""
        try:
            while True:
                event = self._upi_sim.next_event(attack=False)
                await self._on_raw_event(event)
                await asyncio.sleep(self._tick * 3)  # UPI slightly slower cadence
        except asyncio.CancelledError:
            pass

    async def _blockchain_loop(self) -> None:
        """Generate blockchain events when Etherscan is not configured."""
        if self._etherscan:
            return  # live poller handles it
        try:
            while True:
                event = self._blockchain_sim.next_event(attack=False)
                await self._on_raw_event(event)
                await asyncio.sleep(self._tick * 8)
        except asyncio.CancelledError:
            pass

    # ── event ingestion (webhook path) ────────────────────────────────────────

    async def _on_raw_event(self, event: NormalizedEvent) -> None:
        """Accept a pre-normalised event from any adapter and push to engine."""
        await self._bus.publish(event)

    # ── verdict fan-out ────────────────────────────────────────────────────────

    async def _on_verdict(self, verdict) -> None:
        payload = verdict.to_dict()
        explanation_text = None

        if verdict.is_anomaly:
            explanation = self._explainer.explain(verdict)
            explanation_text = explanation.text if explanation else None
            payload["explanation"] = explanation_text
            payload["explanation_source"] = explanation.source if explanation else None
            message = {"type": "alert", "payload": payload}
            # Write to Firestore → Pranav's dashboard reads it live via onSnapshot
            self._firebase.push(verdict, explanation_text)
            # Blockchain anomalies also go to walletActivity collection
            if verdict.source == "blockchain":
                value_eth = next((f.value for f in verdict.tripped_features if f.name == "value_eth"), 0)
                self._firebase.push_wallet_activity(
                    wallet=verdict.entity_id,
                    amount_eth=float(value_eth) if isinstance(value_eth, (int, float)) else 0.0,
                    is_flagged=True,
                )
        else:
            message = {"type": "event", "payload": payload}
            if verdict.source == "blockchain":
                value_eth = next((f.value for f in verdict.tripped_features if f.name == "value_eth"), 0)
                self._firebase.push_wallet_activity(
                    wallet=verdict.entity_id,
                    amount_eth=float(value_eth) if isinstance(value_eth, (int, float)) else 0.0,
                    is_flagged=False,
                )

        await self._broadcast(message)

    async def _broadcast(self, message: dict) -> None:
        dead = []
        for ws in list(self._clients):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._clients.discard(ws)
