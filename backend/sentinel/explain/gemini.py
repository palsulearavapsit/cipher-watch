"""AI explainer client — OpenAI-compatible via aicredits.in proxy.

Off by default. Falls back to template on any failure so the demo
never goes dark due to an API hiccup.
"""

from __future__ import annotations

from typing import Optional

DEFAULT_MODEL = "openai/gpt-4o-mini"   # confirmed working on aicredits.in
AICREDITS_BASE = "https://api.aicredits.in/v1"
DEFAULT_TIMEOUT = 6.0


class GeminiClient:
    """Name kept for interface compatibility — now backed by aicredits.in."""

    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_MODEL,
                 timeout: float = DEFAULT_TIMEOUT) -> None:
        self._timeout = timeout
        self._model = model
        self._client = None

        if api_key:
            try:
                from openai import OpenAI
                self._client = OpenAI(
                    api_key=api_key,
                    base_url=AICREDITS_BASE,
                    timeout=timeout,
                )
            except ImportError:
                self._client = None

    @property
    def available(self) -> bool:
        return self._client is not None

    def build_prompt(self, verdict) -> str:
        lines = [
            "You are a security analyst. Explain this anomaly in 2-3 bullet points,",
            "plain English, for a non-technical reader. Be concise and specific.",
            "Use ONLY the facts below — do not invent signals.",
            "",
            f"Entity: {verdict.entity_id}",
            f"Source: {verdict.source}",
            f"Risk score: {verdict.risk_score}/100",
            "Anomalous signals:",
        ]
        for t in verdict.tripped_features:
            base = "" if t.baseline is None else f", baseline {t.baseline}"
            lines.append(f"  • {t.name} = {t.value} ({t.deviation}{base})")
        return "\n".join(lines)

    def try_explain(self, verdict) -> Optional[str]:
        """Return explanation text, or None on any failure."""
        if not self.available:
            return None
        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=[{"role": "user", "content": self.build_prompt(verdict)}],
                max_tokens=150,
                temperature=0.3,
            )
            text = (resp.choices[0].message.content or "").strip()
            return text or None
        except Exception:
            return None
