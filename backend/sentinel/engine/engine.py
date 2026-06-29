"""AnomalyEngine: source-blind orchestrator.

For each event: score against the entity's current baseline (statistical + IF),
fuse into a 0-100 risk score, emit a Verdict, THEN learn from the event. Scoring
before learning means a spike never pollutes its own baseline.
"""

from __future__ import annotations

import asyncio
from typing import Awaitable, Callable

from ..core.bus import EventBus
from ..core.bus import Subscription
from ..core.events import NormalizedEvent
from .baseline import BaselineStore
from .iforest import IsolationForestDetector
from .statistical import StatisticalDetector
from .verdict import Verdict

RISK_THRESHOLD = 60   # risk_score >= this -> is_anomaly
_STAT_WEIGHT = 0.7    # statistical layer carries the live spike
_IF_WEIGHT = 0.3      # IsolationForest augments but cannot veto a strong stat signal


class AnomalyEngine:
    def __init__(self, baseline_store=None, statistical=None, iforest=None) -> None:
        # Explicit None checks: BaselineStore defines __len__, so an empty
        # passed-in store is falsy and `store or ...` would silently drop it.
        self._store = baseline_store if baseline_store is not None else BaselineStore()
        self._stat = statistical if statistical is not None else StatisticalDetector()
        self._iforest = iforest if iforest is not None else IsolationForestDetector()

    def process(self, event: NormalizedEvent) -> Verdict:
        baseline = self._store.get(event.entity_id)

        stat_score, tripped = self._stat.score(event.features, baseline)
        iforest_score = self._iforest.score(event.entity_id, event.features, baseline)
        risk = self._fuse(stat_score, iforest_score)

        verdict = Verdict(
            entity_id=event.entity_id,
            source=event.source,
            timestamp=event.timestamp,
            is_anomaly=risk >= RISK_THRESHOLD,
            risk_score=risk,
            stat_score=stat_score,
            iforest_score=iforest_score,
            tripped_features=tuple(tripped),
        )

        # Learn only from normal traffic. Score-before-learn protects a single
        # event from normalising itself; this protects the baseline across a whole
        # session of injections. If confirmed anomalies fed the baseline, repeated
        # attacks would gradually teach the engine to accept them and stop firing.
        if not verdict.is_anomaly:
            baseline.update(event.features)
            self._iforest.maybe_fit(event.entity_id, baseline)
        return verdict

    def _fuse(self, stat_score: float, iforest_score) -> int:
        # Stat-dominant by design. With _IF_WEIGHT = 0.3, IsolationForest can only
        # augment an existing statistical signal — on its own it tops out at risk 30
        # and cannot cross the anomaly threshold. This is deliberate for round 1:
        # it keeps IF false positives from firing alerts on stage while the stat
        # layer carries the live spike. Raise _IF_WEIGHT to let IF fire solo once
        # its per-entity false-positive rate is trusted.
        if iforest_score is None:
            combined = stat_score
        else:
            combined = max(stat_score, _STAT_WEIGHT * stat_score + _IF_WEIGHT * iforest_score)
        combined = min(1.0, max(0.0, combined))
        return int(round(100 * combined))

    def start(
        self, bus: EventBus, on_verdict: Callable[[Verdict], Awaitable[None]]
    ) -> asyncio.Task:
        """Race-free wiring: subscribe NOW (synchronously), then schedule the
        consumer. Events published after this returns are guaranteed delivered."""
        subscription = bus.subscribe()
        return asyncio.create_task(self._consume(subscription, on_verdict))

    async def run(
        self, bus: EventBus, on_verdict: Callable[[Verdict], Awaitable[None]]
    ) -> None:
        """Subscribe to the bus and emit a verdict per event (direct-await path).

        Note: the subscription is created when this coroutine first runs, so a
        producer that publishes before then can race. Prefer start() for wiring."""
        await self._consume(bus.subscribe(), on_verdict)

    async def _consume(
        self, subscription: Subscription, on_verdict: Callable[[Verdict], Awaitable[None]]
    ) -> None:
        async for event in subscription:
            await on_verdict(self.process(event))
