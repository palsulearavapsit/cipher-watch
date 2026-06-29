"""Auth source adapter (stub with the real shape).

Full behaviour is a later target; the shape is real so the simulator and engine can
already use it. Raw shape: {user_id, ip, geo, success, count_in_window, ts?}
"""

from __future__ import annotations

from typing import Mapping

from ..core.events import NormalizedEvent
from .base import as_timestamp


class AuthAdapter:
    source = "auth"

    def normalize(self, raw: Mapping) -> NormalizedEvent:
        return NormalizedEvent(
            source=self.source,
            entity_id=str(raw["user_id"]),
            timestamp=as_timestamp(raw.get("ts")),
            features={
                "ip": str(raw.get("ip", "0.0.0.0")),
                "geo": str(raw.get("geo", "")),
                # bool -> 0/1 happens in NormalizedEvent; keep intent explicit here.
                "success": int(bool(raw.get("success", True))),
                "count_in_window": int(raw.get("count_in_window", 1)),
            },
        )
