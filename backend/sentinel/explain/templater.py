"""Deterministic, offline template. The bulletproof default the demo leans on.

Renders a Verdict's tripped features into the plain-English reason judges read.
No network, no key, no hallucination: every bullet comes straight from a feature
the engine actually flagged.
"""

from __future__ import annotations

# Human labels for raw feature names. Unknown names fall back to a prettified key.
_LABELS = {
    "amount": "Transaction amount",
    "count_in_window": "Transaction volume",
    "geo": "Geographic location",
    "ip": "Source IP",
    "success": "Login outcome",
    "write_count": "Database writes",
    "delete_count": "Database deletes",
    "table": "Database table",
}


def _label(name: str) -> str:
    return _LABELS.get(name, name.replace("_", " ").capitalize())


class Templater:
    def render(self, verdict) -> str:
        if not verdict.tripped_features:
            return f"No anomaly detected (risk {verdict.risk_score}/100)."
        bullets = "\n".join(f"• {self._bullet(t)}" for t in verdict.tripped_features)
        return f"Threat detected — risk {verdict.risk_score}/100:\n{bullets}"

    def _bullet(self, t) -> str:
        if t.baseline is None:
            # Categorical novelty (new geo / IP / value).
            return f"{_label(t.name)} '{t.value}' — {t.deviation}"
        return f"{_label(t.name)} {t.value} — {t.deviation} of {t.baseline}"
