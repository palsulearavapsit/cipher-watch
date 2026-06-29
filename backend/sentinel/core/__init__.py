"""Core contract: the NormalizedEvent shape and the source-blind event bus."""

from .events import NormalizedEvent, SOURCES
from .bus import EventBus, Subscription

__all__ = ["NormalizedEvent", "SOURCES", "EventBus", "Subscription"]
