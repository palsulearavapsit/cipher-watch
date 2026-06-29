"""Per-entity normal-behaviour profiles.

'Normal' is per entity, not global: user_2 routinely spends more than user_3, so a
$200 charge is normal for one and a spike for the other. The engine learns these
baselines; the simulator generates traffic consistent with them.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EntityProfile:
    entity_id: str
    home_geo: str
    base_amount: float           # mean transaction amount
    amount_jitter: float         # +/- uniform range around the mean
    normal_count_per_window: int # typical transaction count in the rolling window
    normal_write_rate: int = 2   # typical db writes per window


def default_profiles() -> list[EntityProfile]:
    """A small, demo-friendly set of distinct entities."""
    return [
        EntityProfile("user_1", "US", 50.0, 10.0, 3, 2),
        EntityProfile("user_2", "UK", 120.0, 20.0, 5, 3),
        EntityProfile("user_3", "IN", 30.0, 5.0, 2, 1),
        EntityProfile("user_4", "DE", 200.0, 40.0, 4, 2),
    ]
