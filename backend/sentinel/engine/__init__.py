"""The anomaly engine: source-blind, per-entity, two-layer.

Layer 1 (statistical) carries the live demo spike: rolling mean/std z-score plus
categorical novelty. Layer 2 (IsolationForest) is non-blocking and augments with
subtle per-entity drift. The engine fuses both into a Verdict (risk 0-100 + the
specific features that tripped), which the explanation layer turns into English.
"""

from .verdict import Verdict, TrippedFeature
from .baseline import EntityBaseline, BaselineStore
from .statistical import StatisticalDetector
from .iforest import IsolationForestDetector
from .engine import AnomalyEngine, RISK_THRESHOLD

__all__ = [
    "Verdict",
    "TrippedFeature",
    "EntityBaseline",
    "BaselineStore",
    "StatisticalDetector",
    "IsolationForestDetector",
    "AnomalyEngine",
    "RISK_THRESHOLD",
]
