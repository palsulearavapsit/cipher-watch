"""In-memory async pub/sub. Source-blind by construction.

The simulator and the real adapters publish `NormalizedEvent`s here; the engine
subscribes. The bus never inspects `event.source` — source-blindness is structural,
not a convention. Bounded per-subscriber queues with drop-oldest backpressure keep a
slow consumer (e.g. a paused dashboard) from deadlocking the demo.
"""

from __future__ import annotations

import asyncio

from .events import NormalizedEvent

_CLOSE = object()


class Subscription:
    """An async-iterable view of one subscriber's queue."""

    def __init__(self, queue: "asyncio.Queue", bus: "EventBus") -> None:
        self._queue = queue
        self._bus = bus

    def __aiter__(self) -> "Subscription":
        return self

    async def __anext__(self) -> NormalizedEvent:
        item = await self._queue.get()
        if item is _CLOSE:
            raise StopAsyncIteration
        return item

    async def get(self) -> NormalizedEvent:
        return await self._queue.get()

    def close(self) -> None:
        self._bus._unsubscribe(self._queue)


class EventBus:
    def __init__(self) -> None:
        self._subscribers: list[asyncio.Queue] = []
        self._dropped = 0

    def subscribe(self, maxsize: int = 1000) -> Subscription:
        queue: asyncio.Queue = asyncio.Queue(maxsize=maxsize)
        self._subscribers.append(queue)
        return Subscription(queue, self)

    async def publish(self, event: NormalizedEvent) -> None:
        # Snapshot the list so a concurrent (un)subscribe can't mutate mid-fan-out.
        for queue in list(self._subscribers):
            self._put_with_backpressure(queue, event)

    def _put_with_backpressure(self, queue: "asyncio.Queue", event: NormalizedEvent) -> None:
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            try:
                queue.get_nowait()  # drop oldest
                self._dropped += 1
            except asyncio.QueueEmpty:
                pass
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                self._dropped += 1

    def _unsubscribe(self, queue: "asyncio.Queue") -> None:
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    @property
    def dropped_count(self) -> int:
        return self._dropped

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)
