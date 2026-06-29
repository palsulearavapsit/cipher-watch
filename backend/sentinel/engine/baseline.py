"""Per-entity baseline: what 'normal' looks like for one entity.

Source-blind. Tracks numeric features (rolling history for mean/std + the matrix
the IsolationForest fits on) and categorical features (the set of values seen, so
a never-before-seen geo or IP is detectable as novelty).
"""

from __future__ import annotations

from collections import deque
from typing import Mapping, Optional

import numpy as np

HISTORY = 200  # rolling window of recent numeric records per entity


class EntityBaseline:
    def __init__(self, history: int = HISTORY) -> None:
        self._numeric_history: deque[dict] = deque(maxlen=history)
        self._categorical: dict[str, set] = {}
        self.count = 0

    def update(self, features: Mapping) -> None:
        self.count += 1
        numeric: dict[str, float] = {}
        for key, value in features.items():
            if isinstance(value, bool):
                value = int(value)
            if isinstance(value, (int, float)):
                numeric[key] = float(value)
            else:
                self._categorical.setdefault(key, set()).add(value)
        if numeric:
            self._numeric_history.append(numeric)

    def numeric_stats(self, feature: str) -> Optional[tuple[float, float, int]]:
        vals = [d[feature] for d in self._numeric_history if feature in d]
        if not vals:
            return None
        arr = np.asarray(vals, dtype=float)
        return float(arr.mean()), float(arr.std()), len(vals)

    def has_seen(self, feature: str, value) -> Optional[bool]:
        """True/False if the feature is known categorically; None if never tracked."""
        seen = self._categorical.get(feature)
        if seen is None:
            return None
        return value in seen

    def numeric_feature_names(self) -> list[str]:
        names: set[str] = set()
        for record in self._numeric_history:
            names.update(record.keys())
        return sorted(names)

    def matrix(self, feature_names: list[str]) -> np.ndarray:
        """History as a 2D array (rows = records), missing features -> 0.0."""
        if not self._numeric_history or not feature_names:
            return np.empty((0, len(feature_names)), dtype=float)
        rows = [[record.get(f, 0.0) for f in feature_names] for record in self._numeric_history]
        return np.asarray(rows, dtype=float)


class BaselineStore:
    """One EntityBaseline per entity_id, created on first sight."""

    def __init__(self, factory=EntityBaseline) -> None:
        self._baselines: dict[str, EntityBaseline] = {}
        self._factory = factory

    def get(self, entity_id: str) -> EntityBaseline:
        baseline = self._baselines.get(entity_id)
        if baseline is None:
            baseline = self._factory()
            self._baselines[entity_id] = baseline
        return baseline

    def __len__(self) -> int:
        return len(self._baselines)
