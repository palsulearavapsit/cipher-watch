"""Statistical layer: rolling mean/std z-score + categorical novelty.

This is the cheap layer that catches the dramatic "8x normal volume" spikes that
look great on stage, and the "login from a new geo" novelty. It is the live
trigger; the demo lights up from here even if IsolationForest is still warming up.
"""

from __future__ import annotations

from typing import Mapping

from .baseline import EntityBaseline
from .verdict import TrippedFeature

MIN_SAMPLES = 5      # need this much history before a numeric feature can trip
Z_THRESHOLD = 3.0    # |z| at/above this is anomalous
Z_MAX = 8.0          # |z| at/above this maps to severity 1.0
NOVELTY_SEVERITY = 0.7
_STD_EPS = 1e-9


class StatisticalDetector:
    def score(self, features: Mapping, baseline: EntityBaseline) -> tuple[float, list[TrippedFeature]]:
        tripped: list[TrippedFeature] = []

        for key, value in features.items():
            if isinstance(value, bool):
                value = int(value)

            if isinstance(value, (int, float)):
                trip = self._score_numeric(key, float(value), baseline)
            else:
                trip = self._score_categorical(key, value, baseline)

            if trip is not None:
                tripped.append(trip)

        stat_score = max((t.severity for t in tripped), default=0.0)
        return stat_score, tripped

    def _score_numeric(self, key, value, baseline) -> TrippedFeature | None:
        stats = baseline.numeric_stats(key)
        if stats is None:
            return None
        mean, std, n = stats
        if n < MIN_SAMPLES:
            return None

        if std < _STD_EPS:
            # The feature has been perfectly constant; any change is a strong signal.
            if abs(value - mean) < _STD_EPS:
                return None
            return TrippedFeature(key, value, round(mean, 2), "changed from constant baseline", 1.0)

        z = (value - mean) / std
        if abs(z) < Z_THRESHOLD:
            return None
        severity = min(1.0, abs(z) / Z_MAX)
        direction = "above" if z > 0 else "below"
        return TrippedFeature(key, value, round(mean, 2), f"{abs(z):.1f}σ {direction} baseline", severity)

    def _score_categorical(self, key, value, baseline) -> TrippedFeature | None:
        seen = baseline.has_seen(key, value)
        if seen is False:  # known feature, value never seen before
            return TrippedFeature(key, value, None, "new value not seen before", NOVELTY_SEVERITY)
        return None
