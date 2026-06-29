"""Firebase Firestore sink.

Writes every anomaly verdict into the Firestore 'threats' and 'alerts'
collections so Pranav's React dashboard can read them via onSnapshot.

Graceful degradation: if firebase-admin is not installed or credentials are
missing, the sink silently no-ops so the demo still runs offline.
"""

from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..engine.verdict import Verdict

logger = logging.getLogger(__name__)

# Map our internal source names → human-readable threat type labels
_SOURCE_LABELS: dict[str, str] = {
    "transaction": "Transaction Fraud",
    "upi": "UPI Payment Fraud",
    "auth": "Credential Stuffing",
    "database": "Database Exfiltration",
    "blockchain": "Blockchain Anomaly",
}

_STATUS_MAP = {
    True: "active",
    False: "resolved",
}


class FirebaseSink:
    """Push anomaly verdicts to Firestore. Thread-safe; uses the Admin SDK."""

    def __init__(self, credentials_path: str | None = None) -> None:
        self._db = None
        self._enabled = False
        self._init(credentials_path)

    def _init(self, credentials_path: str | None) -> None:
        creds_path = credentials_path or os.environ.get("FIREBASE_CREDENTIALS_PATH")
        if not creds_path:
            logger.info("FirebaseSink: no credentials path — sink disabled (offline mode)")
            return
        if not os.path.exists(creds_path):
            logger.warning("FirebaseSink: credentials file not found at %s — sink disabled", creds_path)
            return
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                cred = credentials.Certificate(creds_path)
                firebase_admin.initialize_app(cred)

            self._db = firestore.client()
            self._enabled = True
            logger.info("FirebaseSink: connected to Firestore ✓")
        except ImportError:
            logger.warning("FirebaseSink: firebase-admin not installed — run: pip install firebase-admin")
        except Exception as exc:
            logger.error("FirebaseSink: init failed — %s", exc)

    @property
    def enabled(self) -> bool:
        return self._enabled

    def push(self, verdict: "Verdict", explanation_text: str | None = None) -> None:
        """Write verdict to Firestore. No-ops if sink is disabled."""
        if not self._enabled or self._db is None:
            return
        try:
            self._write_threat(verdict, explanation_text)
            self._write_alert(verdict)
        except Exception as exc:
            logger.error("FirebaseSink.push failed: %s", exc)

    def _write_threat(self, verdict: "Verdict", explanation_text: str | None) -> None:
        """Write to Firestore 'threats' collection — matches Pranav's Threat type."""
        threat_id = f"THR-{verdict.entity_id}-{int(verdict.timestamp.timestamp() * 1000)}"
        label = _SOURCE_LABELS.get(verdict.source, verdict.source.replace("_", " ").title())

        doc = {
            "id": threat_id,
            "type": label,
            "score": verdict.risk_score,
            "status": "active",
            "timestamp": verdict.timestamp.isoformat(),
            # Extra fields (Pranav's UI ignores but useful for debugging)
            "source": verdict.source,
            "entity_id": verdict.entity_id,
            "explanation": explanation_text or "",
        }
        self._db.collection("threats").document(threat_id).set(doc)

    def _write_alert(self, verdict: "Verdict") -> None:
        """Write to Firestore 'alerts' collection — matches Pranav's Alert type."""
        alert_id = f"ALT-{verdict.entity_id}-{int(verdict.timestamp.timestamp() * 1000)}"
        alert_type = "error" if verdict.risk_score >= 80 else "warning"
        label = _SOURCE_LABELS.get(verdict.source, verdict.source.replace("_", " ").title())

        doc = {
            "id": alert_id,
            "message": f"{label} detected on {verdict.entity_id} — risk score {verdict.risk_score}",
            "type": alert_type,
            "timestamp": verdict.timestamp.isoformat(),
        }
        self._db.collection("alerts").document(alert_id).set(doc)

    def push_wallet_activity(self, wallet: str, amount_eth: float, is_flagged: bool) -> None:
        """Write to Firestore 'walletActivity' — matches Pranav's WalletActivity type."""
        if not self._enabled or self._db is None:
            return
        try:
            status = "flagged" if is_flagged else "normal"
            doc_id = f"wallet_{wallet[:8]}_{int(__import__('time').time() * 1000)}"
            self._db.collection("walletActivity").document(doc_id).set({
                "wallet": wallet,
                "amount": round(amount_eth, 6),
                "status": status,
            })
        except Exception as exc:
            logger.error("FirebaseSink.push_wallet_activity failed: %s", exc)
