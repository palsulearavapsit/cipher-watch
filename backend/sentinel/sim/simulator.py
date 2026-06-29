"""TrafficSimulator: deterministic normal traffic + on-demand attack injection.

Hard rule (failure mode F4): the simulator never constructs a NormalizedEvent
directly. It builds raw source records and pushes them through
`adapter.normalize()` then `bus.publish()` — the exact path a real source uses.
A seeded RNG makes every run byte-identical, so the live demo is repeatable.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Mapping

from ..adapters import AuthAdapter, DatabaseAdapter, TransactionAdapter
from ..core.bus import EventBus
from ..core.events import NormalizedEvent
from .profiles import EntityProfile, default_profiles

ATTACK_KINDS = ("volume_spike", "credential_stuffing", "mass_delete")

# Which source each attack expresses itself through. Used to fail fast at
# injection time if the needed adapter isn't configured (rather than mid-demo).
_ATTACK_SOURCE = {
    "volume_spike": "transaction",
    "credential_stuffing": "auth",
    "mass_delete": "database",
}

VOLUME_SPIKE_MULTIPLIER = 10   # volume spike reaches 10x the entity's normal count
ATTACK_BURST_DEFAULT = 20      # how many anomalous events one injection produces


class TrafficSimulator:
    def __init__(
        self,
        bus: EventBus,
        adapters: dict | None = None,
        profiles: list[EntityProfile] | None = None,
        seed: int = 1337,
        base_time: datetime | None = None,
    ) -> None:
        self._bus = bus
        self._adapters = adapters or {
            "transaction": TransactionAdapter(),
            "database": DatabaseAdapter(),
            "auth": AuthAdapter(),
        }
        self._profiles = {p.entity_id: p for p in (profiles or default_profiles())}
        if not self._profiles:
            raise ValueError("at least one entity profile is required")
        self._rng = random.Random(seed)
        self._clock = base_time or datetime(2026, 1, 1, tzinfo=timezone.utc)
        self._pending: list[list] = []  # [kind, entity_id, remaining]

    # ---- time ----
    def _advance(self, seconds: float) -> datetime:
        self._clock = self._clock + timedelta(seconds=seconds)
        return self._clock

    # ---- single ingestion path (F4): raw -> adapter.normalize -> bus.publish ----
    async def _emit(self, source: str, raw: Mapping) -> NormalizedEvent:
        event = self._adapters[source].normalize(raw)
        await self._bus.publish(event)
        return event

    # ---- normal generators ----
    def _normal_transaction(self, profile: EntityProfile) -> dict:
        amount = profile.base_amount + self._rng.uniform(
            -profile.amount_jitter, profile.amount_jitter
        )
        return {
            "user_id": profile.entity_id,
            "amount": round(amount, 2),
            "geo": profile.home_geo,
            "count_in_window": profile.normal_count_per_window,
            "ts": self._clock,
        }

    # ---- public API ----
    async def warmup(self, minutes: int) -> int:
        """Fast-forward `minutes` of normal history (1 event/entity/minute).

        Gives every entity a baseline before the demo starts. Returns the number
        of events emitted.
        """
        emitted = 0
        for _ in range(minutes):
            for profile in self._profiles.values():
                self._advance(60)
                await self._emit("transaction", self._normal_transaction(profile))
                emitted += 1
        return emitted

    async def run_normal(self, steps: int) -> int:
        """Emit `steps` ticks of live traffic, expressing any pending attack."""
        emitted = 0
        for _ in range(steps):
            self._advance(1)
            if self._pending:
                await self._tick_attack()
            else:
                profile = self._rng.choice(list(self._profiles.values()))
                await self._emit("transaction", self._normal_transaction(profile))
            emitted += 1
        return emitted

    def inject_attack(
        self, kind: str, entity_id: str, burst: int = ATTACK_BURST_DEFAULT
    ) -> None:
        """Queue an attack. The next `run_normal` ticks express it as anomalous events."""
        if kind not in ATTACK_KINDS:
            raise ValueError(f"unknown attack kind {kind!r}; must be one of {ATTACK_KINDS}")
        if entity_id not in self._profiles:
            raise KeyError(f"unknown entity {entity_id!r}")
        required = _ATTACK_SOURCE[kind]
        if required not in self._adapters:
            raise ValueError(
                f"attack {kind!r} needs a {required!r} adapter, which is not configured"
            )
        self._pending.append([kind, entity_id, burst])

    async def _tick_attack(self) -> NormalizedEvent:
        kind, entity_id, _ = self._pending[0]
        profile = self._profiles[entity_id]

        if kind == "volume_spike":
            raw = self._normal_transaction(profile)
            raw["count_in_window"] = profile.normal_count_per_window * VOLUME_SPIKE_MULTIPLIER
            raw["amount"] = round(profile.base_amount * 5, 2)
            event = await self._emit("transaction", raw)
        elif kind == "credential_stuffing":
            event = await self._emit(
                "auth",
                {
                    "user_id": entity_id,
                    "ip": f"10.0.0.{self._rng.randint(1, 254)}",
                    "geo": "XX",
                    "success": False,
                    "count_in_window": profile.normal_count_per_window * 12,
                    "ts": self._clock,
                },
            )
        else:  # mass_delete
            event = await self._emit(
                "database",
                {
                    "user_id": entity_id,
                    "write_count": 5,
                    "delete_count": 500,
                    "table": "users",
                    "ts": self._clock,
                },
            )

        self._pending[0][2] -= 1
        if self._pending[0][2] <= 0:
            self._pending.pop(0)
        return event
