"""AC3: adapters map raw source records to the one NormalizedEvent shape."""

from datetime import datetime, timezone

from sentinel.adapters import TransactionAdapter, DatabaseAdapter, AuthAdapter


TS = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)


def test_transaction_adapter_maps_reference_shape():
    ev = TransactionAdapter().normalize(
        {"user_id": "user_7", "amount": 42, "geo": "US", "count_in_window": 3, "ts": TS}
    )
    assert ev.source == "transaction"
    assert ev.entity_id == "user_7"
    assert ev.timestamp == TS
    assert ev.features == {"amount": 42.0, "geo": "US", "count_in_window": 3}


def test_database_adapter_stub_shape():
    ev = DatabaseAdapter().normalize(
        {"user_id": "user_7", "write_count": 2, "delete_count": 500, "table": "users", "ts": TS}
    )
    assert ev.source == "database"
    assert ev.features["delete_count"] == 500
    assert ev.features["table"] == "users"


def test_auth_adapter_stub_shape_coerces_success_to_int():
    ev = AuthAdapter().normalize(
        {"user_id": "user_7", "ip": "10.0.0.5", "geo": "XX", "success": False,
         "count_in_window": 9, "ts": TS}
    )
    assert ev.source == "auth"
    assert ev.features["success"] == 0
    assert ev.features["count_in_window"] == 9


def test_all_adapters_emit_same_event_type():
    raws = {
        TransactionAdapter(): {"user_id": "u", "amount": 1, "geo": "US", "count_in_window": 1},
        DatabaseAdapter(): {"user_id": "u"},
        AuthAdapter(): {"user_id": "u"},
    }
    for adapter, raw in raws.items():
        ev = adapter.normalize(raw)
        assert ev.entity_id == "u"
        assert ev.timestamp.tzinfo is not None
