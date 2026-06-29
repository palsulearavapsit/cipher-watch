"""Reference adapter. The pattern every other source follows.

Raw shape: {user_id, amount, geo, count_in_window, ts?}
"""

from __future__ import annotations

from typing import Mapping

from ..core.events import NormalizedEvent
from .base import as_timestamp


class TransactionAdapter:
    source = "transaction"

    def normalize(self, raw: Mapping) -> NormalizedEvent:
        return NormalizedEvent(
            source=self.source,
            entity_id=str(raw["user_id"]),
            timestamp=as_timestamp(raw.get("ts")),
            features={
                "amount": float(raw["amount"]),
                "geo": str(raw["geo"]),
                "count_in_window": int(raw["count_in_window"]),
            },
        )
