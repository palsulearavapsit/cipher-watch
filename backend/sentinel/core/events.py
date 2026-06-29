"""NormalizedEvent: the single contract every data source flows through.

A transaction, a database query, a login attempt, and (optionally) a blockchain
transfer all become this shape on the way in. The anomaly engine consumes
`entity_id + features + timestamp` and never knows or cares what kind of entity it
is looking at. This module is the frozen contract the rest of the team parallelises
on, so its validation is strict: never trust adapter input.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Mapping, Union

# The closed set of sources. Adding a source elsewhere should be a deliberate edit here.
SOURCES = frozenset({"transaction", "database", "auth", "blockchain", "upi"})

FeatureValue = Union[float, int, str]


@dataclass(frozen=True)
class NormalizedEvent:
    """An immutable, validated event in the one shape the engine understands."""

    source: str
    entity_id: str
    timestamp: datetime
    features: Mapping[str, FeatureValue]

    def __post_init__(self) -> None:
        if self.source not in SOURCES:
            raise ValueError(
                f"unknown source {self.source!r}; must be one of {sorted(SOURCES)}"
            )
        if not isinstance(self.entity_id, str) or not self.entity_id.strip():
            raise ValueError("entity_id must be a non-empty string")
        if not isinstance(self.timestamp, datetime):
            raise TypeError("timestamp must be a datetime")
        if self.timestamp.tzinfo is None:
            raise ValueError("timestamp must be timezone-aware (UTC)")
        # Coerce + freeze features so the event is fully immutable.
        coerced = _coerce_features(self.features)
        object.__setattr__(self, "features", MappingProxyType(coerced))

    def to_dict(self) -> dict:
        """Plain-dict form for the websocket / persistence layers."""
        return {
            "source": self.source,
            "entity_id": self.entity_id,
            "timestamp": self.timestamp.isoformat(),
            "features": dict(self.features),
        }

    def __hash__(self) -> int:
        # The frozen dataclass would auto-generate a __hash__ that chokes on the
        # features mapping. Hash over a hashable view instead, so events can be
        # used in sets / as dict keys (feature values are always float|int|str).
        return hash(
            (self.source, self.entity_id, self.timestamp, frozenset(self.features.items()))
        )

    @classmethod
    def from_dict(cls, data: Mapping) -> "NormalizedEvent":
        return cls(
            source=data["source"],
            entity_id=data["entity_id"],
            timestamp=_parse_timestamp(data["timestamp"]),
            features=dict(data["features"]),
        )


def _coerce_features(features: Mapping[str, FeatureValue]) -> dict[str, FeatureValue]:
    if not isinstance(features, Mapping):
        raise TypeError("features must be a mapping")
    out: dict[str, FeatureValue] = {}
    for key, value in features.items():
        if not isinstance(key, str):
            raise TypeError(f"feature key {key!r} must be a string")
        # bool is an int subclass; normalise to 0/1 so the engine sees a number.
        if isinstance(value, bool):
            out[key] = int(value)
        elif isinstance(value, (int, float, str)):
            out[key] = value
        else:
            raise TypeError(
                f"feature {key!r} has unsupported type {type(value).__name__}; "
                "feature values must be float, int, or str"
            )
    return out


def _parse_timestamp(value) -> datetime:
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt
