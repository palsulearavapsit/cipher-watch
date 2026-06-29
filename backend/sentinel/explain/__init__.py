"""Explanation layer: turn a Verdict into a plain-English threat reason.

This is the differentiator. It turns a raw ALERT into explainable threat
intelligence ("volume 10x baseline, login from a new geo"). Three paths, in
order of preference at render time: a pre-primed cache (instant, offline), a live
Gemini call (the upside, behind the key), and a deterministic template fallback
(always works). The live render path never blocks on the network.
"""

from .explanation import Explanation, signature
from .templater import Templater
from .cache import ExplanationCache
from .gemini import GeminiClient
from .explainer import Explainer

__all__ = [
    "Explanation",
    "signature",
    "Templater",
    "ExplanationCache",
    "GeminiClient",
    "Explainer",
]
