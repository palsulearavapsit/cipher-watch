"""Explainer: orchestrate cache -> Gemini -> template for a Verdict.

Default config (use_gemini=False) is fully offline: cache hit, else template.
That is the path the live demo runs on. Enabling Gemini makes it the middle tier
and caches its output, so repeat anomalies of the same shape stay instant.
"""

from __future__ import annotations

from typing import Optional

from .cache import ExplanationCache
from .explanation import Explanation
from .templater import Templater


class Explainer:
    def __init__(self, cache=None, gemini=None, templater=None, use_gemini: bool = False) -> None:
        # Explicit None checks: ExplanationCache defines __len__, so an empty
        # passed-in cache is falsy and `cache or ...` would silently drop it.
        self._cache = cache if cache is not None else ExplanationCache()
        self._gemini = gemini
        self._templater = templater if templater is not None else Templater()
        self._use_gemini = bool(use_gemini and gemini is not None and gemini.available)

    @property
    def cache(self) -> ExplanationCache:
        return self._cache

    def explain(self, verdict) -> Optional[Explanation]:
        # Only anomalies get explained; normal traffic needs no reason.
        if not verdict.is_anomaly:
            return None

        cached = self._cache.get(verdict)
        if cached is not None:
            return Explanation(cached, "cache", verdict.risk_score)

        if self._use_gemini:
            text = self._gemini.try_explain(verdict)
            if text:
                self._cache.put(verdict, text)  # warm the cache for next time
                return Explanation(text, "gemini", verdict.risk_score)

        return Explanation(self._templater.render(verdict), "template", verdict.risk_score)
