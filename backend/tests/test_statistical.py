"""Statistical layer: z-score spikes, constant-baseline jumps, categorical novelty."""

from sentinel.engine.baseline import EntityBaseline
from sentinel.engine.statistical import StatisticalDetector


def _warm(b, n=20, amount=50.0, jitter=5.0, geo="US"):
    # Build a believable baseline with some variance.
    import random

    rng = random.Random(0)
    for _ in range(n):
        b.update({"amount": amount + rng.uniform(-jitter, jitter), "geo": geo})


def test_amount_spike_trips_with_high_severity():
    b = EntityBaseline()
    _warm(b)
    score, tripped = StatisticalDetector().score({"amount": 500.0, "geo": "US"}, b)
    names = [t.name for t in tripped]
    assert "amount" in names
    assert score > 0.9


def test_normal_value_does_not_trip():
    b = EntityBaseline()
    _warm(b)
    score, tripped = StatisticalDetector().score({"amount": 52.0, "geo": "US"}, b)
    assert tripped == []
    assert score == 0.0


def test_insufficient_history_does_not_trip():
    b = EntityBaseline()
    b.update({"amount": 50.0})
    b.update({"amount": 51.0})  # only 2 samples < MIN_SAMPLES
    score, tripped = StatisticalDetector().score({"amount": 9999.0}, b)
    assert tripped == []
    assert score == 0.0


def test_constant_baseline_jump_trips():
    b = EntityBaseline()
    for _ in range(10):
        b.update({"count_in_window": 3})  # perfectly constant
    score, tripped = StatisticalDetector().score({"count_in_window": 30}, b)
    assert any(t.name == "count_in_window" for t in tripped)
    assert score == 1.0


def test_new_geo_is_flagged_as_novelty():
    b = EntityBaseline()
    _warm(b, geo="US")
    score, tripped = StatisticalDetector().score({"amount": 50.0, "geo": "XX"}, b)
    geo_trips = [t for t in tripped if t.name == "geo"]
    assert geo_trips and "new value" in geo_trips[0].deviation
    assert score >= 0.7
