"""The adapter contract: turn a raw source record into a NormalizedEvent."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Mapping, Protocol, runtime_checkable

from ..core.events import NormalizedEvent


@runtime_checkable
class SourceAdapter(Protocol):
    source: str

    def normalize(self, raw: Mapping) -> NormalizedEvent: ...


def as_timestamp(value) -> datetime:
    """Accept a datetime, ISO string, or common date formats; default to now (UTC)."""
    if value is None:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    # Try ISO first, then common bank statement formats
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y",
                "%m/%d/%Y", "%d/%m/%Y %H:%M:%S", "%d-%m-%Y %H:%M:%S"):
        try:
            dt = datetime.strptime(str(value), fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    try:
        dt = datetime.fromisoformat(str(value))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)
