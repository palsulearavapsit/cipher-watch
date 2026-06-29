"""AC4-8: TrafficSimulator determinism, warm-up, attack injection, and the
F4 invariant (everything flows through an adapter + the bus)."""

import asyncio

import pytest

from sentinel.core.bus import EventBus
from sentinel.sim import TrafficSimulator, default_profiles


async def _collect(sub, n):
    out = []
    for _ in range(n):
        out.append(await asyncio.wait_for(sub.get(), timeout=1.0))
    return out


class _SpyAdapter:
    """Wraps a real adapter and counts normalize() calls (F4 proof)."""

    def __init__(self, inner):
        self.inner = inner
        self.source = inner.source
        self.calls = 0

    def normalize(self, raw):
        self.calls += 1
        return self.inner.normalize(raw)


# ---- AC4: determinism ----
def test_same_seed_produces_identical_sequences():
    def run(seed):
        async def body():
            bus = EventBus()
            sub = bus.subscribe(maxsize=10000)
            sim = TrafficSimulator(bus, seed=seed)
            await sim.run_normal(30)
            return [e.to_dict() for e in await _collect(sub, 30)]
        return asyncio.run(body())

    assert run(99) == run(99)


def test_different_seed_diverges():
    def run(seed):
        async def body():
            bus = EventBus()
            sub = bus.subscribe(maxsize=10000)
            sim = TrafficSimulator(bus, seed=seed)
            await sim.run_normal(30)
            return [e.to_dict() for e in await _collect(sub, 30)]
        return asyncio.run(body())

    assert run(1) != run(2)


# ---- AC6: warm-up seeds per-entity baselines ----
def test_warmup_emits_one_event_per_entity_per_minute():
    async def body():
        bus = EventBus()
        sub = bus.subscribe(maxsize=10000)
        sim = TrafficSimulator(bus, seed=1)
        n_entities = len(default_profiles())
        emitted = await sim.warmup(minutes=5)
        assert emitted == 5 * n_entities
        events = await _collect(sub, emitted)
        per_entity = {}
        for e in events:
            per_entity[e.entity_id] = per_entity.get(e.entity_id, 0) + 1
        assert all(count == 5 for count in per_entity.values())
        assert len(per_entity) == n_entities
    asyncio.run(body())


# ---- AC7: volume spike reaches >= 8x baseline ----
def test_volume_spike_exceeds_8x_baseline():
    async def body():
        bus = EventBus()
        sub = bus.subscribe(maxsize=10000)
        sim = TrafficSimulator(bus, seed=1)
        baseline = {p.entity_id: p.normal_count_per_window for p in default_profiles()}["user_1"]
        sim.inject_attack("volume_spike", "user_1", burst=3)
        await sim.run_normal(3)
        events = await _collect(sub, 3)
        assert all(e.entity_id == "user_1" for e in events)
        assert all(e.source == "transaction" for e in events)
        assert all(e.features["count_in_window"] >= 8 * baseline for e in events)
    asyncio.run(body())


# ---- AC8: each attack kind is distinguishable ----
def test_credential_stuffing_pattern():
    async def body():
        bus = EventBus()
        sub = bus.subscribe(maxsize=10000)
        sim = TrafficSimulator(bus, seed=1)
        sim.inject_attack("credential_stuffing", "user_2", burst=4)
        await sim.run_normal(4)
        events = await _collect(sub, 4)
        assert all(e.source == "auth" for e in events)
        assert all(e.features["success"] == 0 for e in events)
        assert all(e.features["count_in_window"] >= 8 for e in events)
    asyncio.run(body())


def test_mass_delete_pattern():
    async def body():
        bus = EventBus()
        sub = bus.subscribe(maxsize=10000)
        sim = TrafficSimulator(bus, seed=1)
        sim.inject_attack("mass_delete", "user_3", burst=2)
        await sim.run_normal(2)
        events = await _collect(sub, 2)
        assert all(e.source == "database" for e in events)
        assert all(e.features["delete_count"] == 500 for e in events)
    asyncio.run(body())


# ---- AC5 / F4: everything flows through an adapter + the bus ----
def test_f4_all_events_pass_through_an_adapter():
    async def body():
        from sentinel.adapters import AuthAdapter, DatabaseAdapter, TransactionAdapter

        bus = EventBus()
        sub = bus.subscribe(maxsize=10000)
        spies = {
            "transaction": _SpyAdapter(TransactionAdapter()),
            "database": _SpyAdapter(DatabaseAdapter()),
            "auth": _SpyAdapter(AuthAdapter()),
        }
        sim = TrafficSimulator(bus, adapters=spies, seed=1)
        await sim.warmup(minutes=2)          # 2 * 4 entities = 8
        sim.inject_attack("mass_delete", "user_1", burst=2)
        await sim.run_normal(10)             # 2 attack + 8 normal = 10
        total_emitted = 8 + 10
        events = await _collect(sub, total_emitted)
        total_normalize_calls = sum(s.calls for s in spies.values())
        assert total_normalize_calls == total_emitted == len(events)
    asyncio.run(body())


# ---- input validation ----
def test_inject_attack_rejects_unknown_kind_and_entity():
    bus = EventBus()
    sim = TrafficSimulator(bus, seed=1)
    with pytest.raises(ValueError):
        sim.inject_attack("not_an_attack", "user_1")
    with pytest.raises(KeyError):
        sim.inject_attack("volume_spike", "ghost_user")


def test_inject_attack_rejects_missing_adapter():
    # credential_stuffing needs an 'auth' adapter; fail fast at injection, not mid-demo.
    from sentinel.adapters import TransactionAdapter

    bus = EventBus()
    sim = TrafficSimulator(bus, adapters={"transaction": TransactionAdapter()}, seed=1)
    with pytest.raises(ValueError):
        sim.inject_attack("credential_stuffing", "user_1")
