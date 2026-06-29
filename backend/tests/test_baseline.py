"""Per-entity baseline: numeric stats, categorical novelty, IF matrix."""

from sentinel.engine.baseline import BaselineStore, EntityBaseline


def test_numeric_stats_accumulate():
    b = EntityBaseline()
    for amount in (10.0, 20.0, 30.0):
        b.update({"amount": amount})
    mean, std, n = b.numeric_stats("amount")
    assert mean == 20.0
    assert n == 3
    assert std > 0


def test_numeric_stats_none_for_unknown_feature():
    b = EntityBaseline()
    b.update({"amount": 1.0})
    assert b.numeric_stats("nope") is None


def test_categorical_novelty():
    b = EntityBaseline()
    b.update({"geo": "US"})
    assert b.has_seen("geo", "US") is True
    assert b.has_seen("geo", "XX") is False   # known feature, new value
    assert b.has_seen("never_tracked", "x") is None


def test_matrix_shape_and_padding():
    b = EntityBaseline()
    b.update({"amount": 1.0, "count_in_window": 3})
    b.update({"amount": 2.0})  # missing count_in_window -> padded
    names = b.numeric_feature_names()
    assert names == ["amount", "count_in_window"]
    m = b.matrix(names)
    assert m.shape == (2, 2)
    assert m[1][1] == 0.0  # padded missing feature


def test_store_creates_one_baseline_per_entity():
    store = BaselineStore()
    a = store.get("user_1")
    again = store.get("user_1")
    other = store.get("user_2")
    assert a is again
    assert a is not other
    assert len(store) == 2
