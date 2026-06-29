"""API layer: deterministic service internals + HTTP/WS via TestClient."""

import asyncio

import pytest
from starlette.testclient import TestClient

from sentinel.api import SentinelService, create_app


class _FakeWS:
    def __init__(self):
        self.messages = []

    async def send_json(self, message):
        self.messages.append(message)


class _DeadWS:
    async def send_json(self, message):
        raise RuntimeError("client gone")


# ---- deterministic service internals ----
def test_warmup_then_inject_broadcasts_alert_with_explanation():
    async def body():
        service = SentinelService(seed=1, warmup_minutes=15)
        await service.warmup()
        fake = _FakeWS()
        service.add_client(fake)
        service.inject("volume_spike", "user_1", burst=5)
        await service.pump(5)
        alerts = [
            m for m in fake.messages
            if m["type"] == "alert" and m["payload"]["entity_id"] == "user_1"
        ]
        assert alerts, "attack should produce an alert message"
        assert alerts[0]["payload"]["explanation"], "alert must carry a plain-English reason"

    asyncio.run(body())


def test_broadcast_drops_dead_clients():
    async def body():
        service = SentinelService()
        good, bad = _FakeWS(), _DeadWS()
        service.add_client(good)
        service.add_client(bad)
        await service._broadcast({"type": "event", "payload": {}})
        assert service.client_count == 1   # dead client pruned
        assert good.messages               # healthy client still got it

    asyncio.run(body())


def test_inject_validates_input():
    service = SentinelService()
    with pytest.raises(ValueError):
        service.inject("not_an_attack", "user_1")
    with pytest.raises(KeyError):
        service.inject("volume_spike", "ghost_user")


# ---- HTTP via TestClient (lifespan runs warmup + background loop) ----
def test_http_endpoints():
    with TestClient(create_app(tick_interval=0.005, warmup_minutes=3, seed=1)) as client:
        assert client.get("/health").json()["status"] == "ok"

        entities = client.get("/entities").json()
        assert "user_1" in entities["entities"]
        assert "volume_spike" in entities["attacks"]

        assert client.post("/inject", json={"kind": "volume_spike", "entity_id": "user_1"}).status_code == 200
        assert client.post("/inject", json={"kind": "bad", "entity_id": "user_1"}).status_code == 400
        assert client.post("/inject", json={"kind": "volume_spike", "entity_id": "ghost"}).status_code == 400
        # burst out of bounds -> pydantic 422
        assert client.post("/inject", json={"kind": "volume_spike", "entity_id": "user_1", "burst": 9999}).status_code == 422


# ---- websocket end-to-end: inject -> alert appears on the stream ----
def test_ws_alert_stream():
    # warmup_minutes must exceed the statistical MIN_SAMPLES (5) or the engine has
    # too little history to flag anything.
    with TestClient(create_app(tick_interval=0.005, warmup_minutes=15, seed=1)) as client:
        with client.websocket_connect("/ws") as ws:
            client.post("/inject", json={"kind": "volume_spike", "entity_id": "user_1", "burst": 15})
            found = False
            for _ in range(1000):
                msg = ws.receive_json()
                if msg["type"] == "alert" and msg["payload"]["entity_id"] == "user_1":
                    assert msg["payload"]["explanation"]
                    found = True
                    break
            assert found, "expected an alert for the attacked entity on the ws stream"
