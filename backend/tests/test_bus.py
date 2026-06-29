"""AC2: EventBus fan-out + drop-oldest backpressure, no deadlock."""

import asyncio
from datetime import datetime, timezone

from sentinel.core.bus import EventBus
from sentinel.core.events import NormalizedEvent


def _event(i):
    return NormalizedEvent(
        "transaction", f"user_{i}", datetime(2026, 1, 1, tzinfo=timezone.utc),
        {"amount": float(i), "geo": "US", "count_in_window": 1},
    )


def test_fanout_each_subscriber_receives_once():
    async def body():
        bus = EventBus()
        subs = [bus.subscribe() for _ in range(3)]
        ev = _event(0)
        await bus.publish(ev)
        for sub in subs:
            got = await asyncio.wait_for(sub.get(), timeout=1.0)
            assert got.entity_id == "user_0"
    asyncio.run(body())


def test_drop_oldest_increments_dropped_count():
    async def body():
        bus = EventBus()
        sub = bus.subscribe(maxsize=2)
        for i in range(5):
            await bus.publish(_event(i))  # never consumed -> overflow
        # 5 published, capacity 2 -> 3 dropped, newest two retained
        assert bus.dropped_count == 3
        first = await sub.get()
        second = await sub.get()
        assert (first.entity_id, second.entity_id) == ("user_3", "user_4")
    asyncio.run(body())


def test_unsubscribe_stops_fanout():
    async def body():
        bus = EventBus()
        sub = bus.subscribe()
        assert bus.subscriber_count == 1
        sub.close()
        assert bus.subscriber_count == 0
        await bus.publish(_event(0))  # no subscribers -> no error
    asyncio.run(body())


def test_async_iteration_yields_events():
    async def body():
        bus = EventBus()
        sub = bus.subscribe()
        await bus.publish(_event(1))
        await bus.publish(_event(2))
        seen = []
        async for ev in sub:
            seen.append(ev.entity_id)
            if len(seen) == 2:
                break
        assert seen == ["user_1", "user_2"]
    asyncio.run(body())
