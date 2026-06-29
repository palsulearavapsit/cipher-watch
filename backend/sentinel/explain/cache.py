"""Explanation cache, keyed by verdict signature.

Prime it before the demo (e.g. with a Gemini-generated explanation for the
scripted attack) and every matching anomaly serves instantly with no network.
"""

from __future__ import annotations

from typing import Optional

from .explanation import signature


class ExplanationCache:
    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    def get(self, verdict) -> Optional[str]:
        return self._store.get(signature(verdict))

    def put(self, verdict, text: str) -> None:
        self._store[signature(verdict)] = text

    # Alias for readability when seeding before a demo.
    prime = put

    def __len__(self) -> int:
        return len(self._store)
