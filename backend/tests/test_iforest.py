"""IsolationForest layer: trains after enough history, scores outliers higher,
and stays silent (None) before it's ready."""

import pytest

from sentinel.engine.baseline import EntityBaseline
from sentinel.engine.iforest import IsolationForestDetector, MIN_FIT, _HAS_SKLEARN

pytestmark = pytest.mark.skipif(not _HAS_SKLEARN, reason="scikit-learn not installed")


def _warm(b, n=MIN_FIT + 10):
    import random

    rng = random.Random(0)
    for _ in range(n):
        b.update({"amount": 50.0 + rng.uniform(-5, 5), "count_in_window": 3})


def test_score_is_none_before_fit():
    det = IsolationForestDetector()
    b = EntityBaseline()
    _warm(b)
    # never called maybe_fit -> no model
    assert det.score("user_1", {"amount": 50.0, "count_in_window": 3}, b) is None


def test_outlier_scores_higher_than_normal():
    det = IsolationForestDetector()
    b = EntityBaseline()
    _warm(b)
    det.maybe_fit("user_1", b)
    normal = det.score("user_1", {"amount": 50.0, "count_in_window": 3}, b)
    outlier = det.score("user_1", {"amount": 5000.0, "count_in_window": 300}, b)
    assert normal is not None and outlier is not None
    assert 0.0 <= normal <= 1.0 and 0.0 <= outlier <= 1.0
    assert outlier > normal


def test_does_not_fit_below_min_samples():
    det = IsolationForestDetector()
    b = EntityBaseline()
    for _ in range(MIN_FIT - 1):
        b.update({"amount": 50.0, "count_in_window": 3})
    det.maybe_fit("user_1", b)
    assert det.score("user_1", {"amount": 50.0, "count_in_window": 3}, b) is None
