"""The explanation result and the cache signature.

The signature groups anomalies of the same shape (same source + same set of
tripped features) so one pre-generated explanation covers every event in an
attack burst — prime it once, serve it instantly for the whole demo.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Explanation:
    text: str
    source: str        # "cache" | "gemini" | "template"
    risk_score: int


def signature(verdict) -> str:
    names = ",".join(sorted(t.name for t in verdict.tripped_features))
    return f"{verdict.source}|{names}"
