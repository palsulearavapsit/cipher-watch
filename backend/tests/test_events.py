"""AC1: NormalizedEvent validation + immutability + (de)serialization."""

from datetime import datetime, timezone

import pytest

from sentinel.core.events import NormalizedEvent, SOURCES


def _ts():
    return datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)


def test_valid_event_constructs_and_is_immutable():
    ev = NormalizedEvent("transaction", "user_1", _ts(), {"amount": 10.0, "geo": "US"})
    assert ev.source == "transaction"
    assert ev.entity_id == "user_1"
    assert ev.features["amount"] == 10.0
    with pytest.raises(Exception):
        ev.source = "auth"  # frozen dataclass
    with pytest.raises(Exception):
        ev.features["amount"] = 999  # read-only mapping


def test_rejects_unknown_source():
    with pytest.raises(ValueError):
        NormalizedEvent("not_a_source", "user_1", _ts(), {})


def test_rejects_empty_entity_id():
    with pytest.raises(ValueError):
        NormalizedEvent("auth", "   ", _ts(), {})


def test_rejects_naive_timestamp():
    naive = datetime(2026, 1, 1, 12, 0)  # no tzinfo
    with pytest.raises(ValueError):
        NormalizedEvent("auth", "user_1", naive, {})


def test_rejects_unsupported_feature_type():
    with pytest.raises(TypeError):
        NormalizedEvent("auth", "user_1", _ts(), {"bad": ["a", "list"]})


def test_bool_feature_coerced_to_int():
    ev = NormalizedEvent("auth", "user_1", _ts(), {"success": True})
    assert ev.features["success"] == 1
    assert isinstance(ev.features["success"], int)


def test_roundtrip_to_from_dict():
    ev = NormalizedEvent("transaction", "user_1", _ts(), {"amount": 12.5, "geo": "US"})
    again = NormalizedEvent.from_dict(ev.to_dict())
    assert again.to_dict() == ev.to_dict()


def test_sources_are_the_expected_set():
    assert SOURCES == {"transaction", "database", "auth", "blockchain", "upi"}


def test_event_is_hashable_and_usable_in_sets():
    # Regression: a frozen value type must not blow up on hash() / set membership.
    a = NormalizedEvent("transaction", "u", _ts(), {"amount": 1.0, "geo": "US"})
    b = NormalizedEvent("transaction", "u", _ts(), {"amount": 1.0, "geo": "US"})
    assert hash(a) == hash(b)
    assert len({a, b}) == 1
    assert {a: "ok"}[b] == "ok"
