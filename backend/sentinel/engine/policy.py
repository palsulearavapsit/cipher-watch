import asyncio
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..engine.verdict import Verdict
    from ..sinks.firebase_sink import FirebaseSink

logger = logging.getLogger(__name__)

class PolicyEngine:
    """Autonomous Incident Response Policy Engine.
    
    Triggered when an anomaly with a risk score >= 80 is detected.
    Executes containment policies based on threat source and updates Firestore.
    """

    def __init__(self, firebase_sink: "FirebaseSink") -> None:
        self._firebase = firebase_sink

    def process(self, verdict: "Verdict") -> None:
        if not verdict.is_anomaly:
            return
        
        # Deploy remediation automatically for critical incidents (score >= 80)
        if verdict.risk_score >= 80:
            logger.info("[🤖 Policy Engine] Triggered autonomous response for entity %s (score %d)", verdict.entity_id, verdict.risk_score)
            asyncio.create_task(self._deploy_remediation(verdict))

    async def _deploy_remediation(self, verdict: "Verdict") -> None:
        # Simulate slight network delay for containment action execution
        await asyncio.sleep(2.0)
        
        source = verdict.source
        actions = {
            "upi": "Blocked VPA and isolated UPI Gateway credentials",
            "blockchain": "Blacklisted target contract and broadcasted pause signal",
            "database": "Terminated MySQL query thread and revoked session API tokens",
            "auth": "Terminated user session and locked account in AuthDB",
            "transaction": "Throttled endpoint rate limits and added GeoIP blocking"
        }
        
        action = actions.get(source, "Deployed routing reject rules")
        threat_id = f"THR-{verdict.entity_id}-{int(verdict.timestamp.timestamp() * 1000)}"
        
        if not self._firebase.enabled or self._firebase._db is None:
            logger.info("[🤖 Policy Engine] Offline mode: Containment rule '%s' triggered locally for %s.", action, threat_id)
            return

        try:
            # Update the Firestore document to contained, appending remediation logs
            self._firebase._db.collection("threats").document(threat_id).update({
                "status": "contained",
                "remediation": f"[🤖 AUTONOMOUS] {action}"
            })
            logger.info("[🤖 Policy Engine] Successfully deployed containment policy for %s", threat_id)
        except Exception as e:
            logger.error("[🤖 Policy Engine] Failed to deploy policy to Firestore: %s", e)
