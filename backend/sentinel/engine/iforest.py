"""IsolationForest layer: unsupervised, per-entity, non-blocking.

Catches subtle per-entity drift the statistical layer misses. It is deliberately
optional and secondary: if scikit-learn is missing, or an entity hasn't enough
history, score() returns None and the engine runs on the statistical layer alone.
The demo never depends on this layer being trained.
"""

from __future__ import annotations

from typing import Mapping, Optional

import numpy as np

try:
    from sklearn.ensemble import IsolationForest

    _HAS_SKLEARN = True
except ImportError:  # pragma: no cover - exercised only when sklearn absent
    _HAS_SKLEARN = False

MIN_FIT = 20         # samples before a per-entity model is trained
REFIT_INTERVAL = 25  # retrain every N events so the baseline keeps up
N_ESTIMATORS = 100
RANDOM_STATE = 42    # deterministic models for repeatable demos
_ANOMALY_SCALE = 4.0


class IsolationForestDetector:
    def __init__(self) -> None:
        self._models: dict[str, tuple] = {}  # entity_id -> (model, feature_names)

    @property
    def available(self) -> bool:
        return _HAS_SKLEARN

    def maybe_fit(self, entity_id: str, baseline) -> None:
        if not _HAS_SKLEARN or baseline.count < MIN_FIT:
            return
        already = entity_id in self._models
        if already and baseline.count % REFIT_INTERVAL != 0:
            return

        names = baseline.numeric_feature_names()
        matrix = baseline.matrix(names)
        if matrix.shape[0] < MIN_FIT or matrix.shape[1] == 0:
            return

        model = IsolationForest(
            n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE, contamination="auto"
        )
        model.fit(matrix)
        self._models[entity_id] = (model, names)

    def score(self, entity_id: str, features: Mapping, baseline) -> Optional[float]:
        model_entry = self._models.get(entity_id)
        if model_entry is None:
            return None
        model, names = model_entry
        vector = np.asarray(
            [[float(features.get(f, 0.0)) for f in names]], dtype=float
        )
        # decision_function: >=0 normal, <0 anomaly. Only contribute for genuine
        # anomalies so normal traffic reads as risk 0 rather than a constant IF floor.
        df = float(model.decision_function(vector)[0])
        if df >= 0.0:
            return 0.0
        return float(min(1.0, -df * _ANOMALY_SCALE))
