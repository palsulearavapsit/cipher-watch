"""FastAPI surface: warms up baselines, streams verdicts over a websocket, and
exposes the attack-injection 'button' endpoint. The only network-facing layer."""

from .service import SentinelService
from .app import create_app

__all__ = ["SentinelService", "create_app"]
