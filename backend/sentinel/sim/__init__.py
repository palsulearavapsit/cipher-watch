"""Traffic simulator: the mechanic that makes the demo live.

Pumps normal traffic, supports a warm-up phase so baselines exist before the demo,
and injects attacks on demand. Everything it emits flows through the same
adapter + bus path the real sources use (no private side channel)."""

from .profiles import EntityProfile, default_profiles
from .simulator import TrafficSimulator, ATTACK_KINDS

__all__ = ["TrafficSimulator", "EntityProfile", "default_profiles", "ATTACK_KINDS"]
