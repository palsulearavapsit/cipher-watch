"""Database source adapter (stub with the real shape).

Full behaviour is a later target; the shape is real so the simulator and engine can
already use it. Raw shape: {user_id, write_count, delete_count, table, ts?}
"""

from __future__ import annotations

from typing import Mapping

from ..core.events import NormalizedEvent
from .base import as_timestamp


class DatabaseAdapter:
    source = "database"

    def normalize(self, raw: Mapping) -> NormalizedEvent:
        return NormalizedEvent(
            source=self.source,
            entity_id=str(raw["user_id"]),
            timestamp=as_timestamp(raw.get("ts")),
            features={
                "write_count": int(raw.get("write_count", 0)),
                "delete_count": int(raw.get("delete_count", 0)),
                "table": str(raw.get("table", "unknown")),
            },
        )
