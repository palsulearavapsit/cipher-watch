"""AnomalyEngine: fusion, cold start, and the end-to-end demo path
(real simulator -> bus -> engine -> anomaly verdict)."""

import asyncio
from datetime import datetime, timedelta, timezone

from sentinel.core.bus import EventBus
from sentinel.core.events import NormalizedEvent
from sentinel.engine import AnomalyEngine, RISK_THRESHOLD
from sentinel.sim import TrafficSimulator


def _txn(entity, amount, count, geo="US", t=None):
    return NormalizedEvent(
        "transaction", entity, t or datetime(2026, 1, 1, tzinfo=timezone.utc),
        {"amount": float(amount), "geo": geo, "count_in_window": int(count)},
    )


def test_cold_start_is_not_anomalous():
    engine = AnomalyEngine()
    v = engine.process(_txn("user_1", 50.0, 3))
    assert v.is_anomaly is False
    assert v.risk_score == 0
    assert v.tripped_features == ()


def test_warmed_baseline_then_spike_flags_anomaly():
    engine = AnomalyEngine()
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    # Warm a believable baseline.
    import random
    rng = random.Random(0)
    for i in range(40):
        engine.process(_txn("user_1", 50.0 + rng.uniform(-8, 8), 3, t=base + timedelta(seconds=i)))
    # Now a clear spike.
    v = engine.process(_txn("user_1", 600.0, 30, t=base + timedelta(seconds=100)))
    assert v.is_anomaly is True
    assert v.risk_score >= RISK_THRESHOLD
    assert any(t.name == "amount" for t in v.tripped_features)


def test_repeated_attacks_keep_firing_baseline_not_polluted():
    # Regression: a confirmed anomaly must not enter the baseline, or repeated
    # injections gradually teach the engine to accept the attack and stop firing.
    engine = AnomalyEngine()
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    import random
    rng = random.Random(0)
    for i in range(40):
        engine.process(_txn("user_1", 50.0 + rng.uniform(-8, 8), 3, t=base + timedelta(seconds=i)))
    flagged = 0
    for i in range(30):
        v = engine.process(_txn("user_1", 600.0, 30, t=base + timedelta(seconds=200 + i)))
        flagged += int(v.is_anomaly)
    assert flagged == 30, f"every repeated attack should still fire, got {flagged}/30"


def test_verdict_serializes():
    engine = AnomalyEngine()
    v = engine.process(_txn("user_1", 50.0, 3))
    d = v.to_dict()
    assert set(d) >= {"entity_id", "risk_score", "is_anomaly", "tripped_features"}


def test_end_to_end_inject_attack_lights_up():
    """THE demo-path test: warm baselines, inject a volume spike through the real
    simulator, drain the bus through the engine, and assert the attacked entity
    produces an anomaly verdict with a tripped feature."""

    async def body():
        bus = EventBus()
        sub = bus.subscribe(maxsize=100000)
        engine = AnomalyEngine()
        sim = TrafficSimulator(bus, seed=1)

        warm = await sim.warmup(minutes=30)   # 30 events/entity * 4 entities
        sim.inject_attack("volume_spike", "user_1", burst=5)
        attack = await sim.run_normal(5)

        verdicts = []
        for _ in range(warm + attack):
            verdicts.append(engine.process(await sub.get()))

        attacked = [v for v in verdicts if v.entity_id == "user_1" and v.is_anomaly]
        assert attacked, "expected at least one anomaly verdict for the attacked entity"
        top = max(attacked, key=lambda v: v.risk_score)
        assert top.risk_score >= RISK_THRESHOLD
        assert top.tripped_features, "anomaly verdict must name the features that tripped"

        # Normal entities should stay calm (no false-positive storm).
        normals = [v for v in verdicts if v.entity_id == "user_2"]
        assert not any(v.is_anomaly for v in normals)

    asyncio.run(body())


def test_engine_run_consumes_bus():
    async def body():
        bus = EventBus()
        engine = AnomalyEngine()
        seen = []

        async def on_verdict(v):
            seen.append(v)

        task = engine.start(bus, on_verdict)  # subscribes synchronously, race-free
        await bus.publish(_txn("user_1", 50.0, 3))
        await bus.publish(_txn("user_1", 51.0, 3))
        await asyncio.sleep(0.05)  # let the consumer drain
        task.cancel()
        assert len(seen) == 2

    asyncio.run(body())
