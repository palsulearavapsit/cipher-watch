"""The engine's output contract: a Verdict and the features that tripped it.

The tripped_features list is what the Gemini layer turns into a plain-English
reason, so it carries human-readable deviations ("10.2σ above baseline",
"new value not seen before"), not just raw numbers.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Union

Scalar = Union[float, int, str]


@dataclass(frozen=True)
class TrippedFeature:
    name: str
    value: Scalar
    baseline: Optional[Scalar]   # mean for numeric, None for categorical novelty
    deviation: str               # human-readable, e.g. "10.2σ above baseline"
    severity: float              # 0..1

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "value": self.value,
            "baseline": self.baseline,
            "deviation": self.deviation,
            "severity": round(self.severity, 3),
        }


@dataclass(frozen=True)
class Verdict:
    entity_id: str
    source: str
    timestamp: datetime
    is_anomaly: bool
    risk_score: int                       # 0..100
    stat_score: float                     # 0..1 (statistical layer)
    iforest_score: Optional[float]        # 0..1, or None if IF not trained yet
    tripped_features: tuple[TrippedFeature, ...]

    def to_dict(self) -> dict:
        return {
            "entity_id": self.entity_id,
            "source": self.source,
            "timestamp": self.timestamp.isoformat(),
            "is_anomaly": self.is_anomaly,
            "risk_score": self.risk_score,
            "stat_score": round(self.stat_score, 3),
            "iforest_score": (None if self.iforest_score is None else round(self.iforest_score, 3)),
            "tripped_features": [t.to_dict() for t in self.tripped_features],
        }
