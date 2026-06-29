"""FastAPI app factory + entrypoint.

Endpoints:
  GET  /health         — liveness + status flags
  GET  /entities       — entity list + available attack kinds
  POST /inject         — trigger an attack (existing sources)
  POST /inject/upi     — trigger a UPI fraud burst
  POST /inject/blockchain — trigger a blockchain anomaly burst
  POST /webhook/upi    — live UPI webhook receiver (Razorpay format)
  WS   /ws             — real-time verdict stream
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

# Load .env automatically so keys are available without shell exports
try:
    from dotenv import load_dotenv
    root_env = Path(__file__).resolve().parents[3] / ".env"
    backend_env = Path(__file__).resolve().parents[2] / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=False)
    elif backend_env.exists():
        load_dotenv(backend_env, override=False)
    else:
        load_dotenv()
except ImportError:
    pass

import json
from fastapi import FastAPI, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ..adapters.upi import UPIAdapter
from ..adapters.database import DatabaseAdapter
from ..adapters.transaction import TransactionAdapter
from ..adapters.auth import AuthAdapter
from ..adapters.blockchain import BlockchainAdapter
from ..explain import GeminiClient
from ..sim.simulator import ATTACK_BURST_DEFAULT, ATTACK_KINDS
from .service import SentinelService
from .wallet_analyzer import fetch_wallet_transactions, normalize_etherscan_tx
from .upi_parser import parse_upi_csv

logger = logging.getLogger(__name__)

_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


class InjectBody(BaseModel):
    kind: str
    entity_id: str
    burst: int = Field(default=ATTACK_BURST_DEFAULT, ge=1, le=500)


class ChatBody(BaseModel):
    prompt_type: str
    threats: list


def create_app(
    seed: int = 1337,
    tick_interval: float = 0.25,
    warmup_minutes: int = 20,
    use_gemini: bool | None = None,
) -> FastAPI:
    if use_gemini is None:
        use_gemini = os.environ.get("ENABLE_GEMINI", "false").lower() == "true"

    service = SentinelService(
        seed=seed,
        tick_interval=tick_interval,
        warmup_minutes=warmup_minutes,
        use_gemini=use_gemini,
    )
    upi_adapter = UPIAdapter()
    db_adapter = DatabaseAdapter()
    txn_adapter = TransactionAdapter()
    auth_adapter = AuthAdapter()
    blockchain_adapter = BlockchainAdapter()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await service.start()
        try:
            yield
        finally:
            await service.stop()

    app = FastAPI(title="CipherWatch", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_DEV_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.state.service = service

    # ── health ─────────────────────────────────────────────────────────────────

    @app.get("/health")
    async def health():
        return {
            "status": "ok",
            "clients": service.client_count,
            "firebase": service.firebase_enabled,
            "gemini": use_gemini,
        }

    @app.post("/api/chat")
    async def chat(body: ChatBody):
        gemini_client = GeminiClient(api_key=os.environ.get("GEMINI_API_KEY"))
        if not gemini_client.available:
            return {"response": "Error: Gemini API Client is not configured on the backend. Please check your GEMINI_API_KEY in the .env file."}

        system_instruction = (
            "You are a senior SecOps AI analyst at CipherWatch. "
            "Analyze the provided security anomalies list and answer the selected question "
            "in a professional, concise security operations center style. "
            "Use clean Markdown formatting. Focus only on the provided facts."
        )

        threats_context = json.dumps(body.threats, indent=2)

        if body.prompt_type == "latest":
            user_prompt = (
                f"Here are the recent anomalies:\n{threats_context}\n\n"
                "Please identify and analyze the absolute newest anomaly log in the system (the one with the latest timestamp). "
                "Explain what triggered it, its source, risk score, and provide immediate remediation steps."
            )
        elif body.prompt_type == "critical":
            user_prompt = (
                f"Here are the recent anomalies:\n{threats_context}\n\n"
                "Identify the anomaly with the highest risk score, explain why it is classified as critical, "
                "and detail its impact and potential danger."
            )
        elif body.prompt_type == "ignore":
            user_prompt = (
                f"Here are the recent anomalies:\n{threats_context}\n\n"
                "List which anomalies have low risk scores (< 40) or benign behaviors and can be ignored or deprioritized by security analysts."
            )
        elif body.prompt_type == "summary":
            user_prompt = (
                f"Here are the recent anomalies:\n{threats_context}\n\n"
                "Provide a high-level summary of all anomalies in this batch. Group them by category (UPI, DB, Blockchain, Auth) and outline where they occurred."
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid prompt type")

        try:
            resp = gemini_client._client.chat.completions.create(
                model=gemini_client._model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=300,
                temperature=0.3,
            )
            response_text = (resp.choices[0].message.content or "").strip()
            return {"response": response_text}
        except Exception as e:
            return {"response": f"Gemini API Error: {str(e)}"}

    # ── entity / metadata ──────────────────────────────────────────────────────

    @app.get("/entities")
    async def entities():
        return {
            "entities": service.entities(),
            "attacks": list(ATTACK_KINDS),
            "sources": ["transaction", "upi", "auth", "database", "blockchain"],
        }

    # ── attack injection (existing sources) ───────────────────────────────────

    @app.post("/inject")
    async def inject(body: InjectBody):
        try:
            service.inject(body.kind, body.entity_id, body.burst)
        except (ValueError, KeyError) as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return {"ok": True, "kind": body.kind, "entity_id": body.entity_id}

    # ── UPI attack button ─────────────────────────────────────────────────────

    @app.post("/inject/upi")
    async def inject_upi():
        service.inject_upi_attack()
        return {"ok": True, "kind": "upi_fraud"}

    # ── blockchain attack button ──────────────────────────────────────────────

    @app.post("/inject/blockchain")
    async def inject_blockchain():
        service.inject_blockchain_attack()
        return {"ok": True, "kind": "blockchain_anomaly"}

    # ── Real wallet analysis — user enters THEIR wallet address ───────────────

    @app.post("/analyze/wallet")
    async def analyze_wallet(request: Request):
        """Fetch real transactions for a wallet from Etherscan and analyze each one."""
        data = await request.json()
        address = data.get("address", "").strip()
        if not address or not address.startswith("0x"):
            raise HTTPException(status_code=422, detail="Invalid ETH address (must start with 0x)")

        try:
            txs = await fetch_wallet_transactions(address, limit=int(data.get("limit", 30)))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        if not txs:
            return {"address": address, "transactions": [], "summary": {"total": 0, "flagged": 0}}

        results = []
        flagged = 0
        for tx in txs:
            normalized = normalize_etherscan_tx(tx, address)
            event = blockchain_adapter.normalize(normalized)
            verdict = service.analyze_now(event)
            verdict["_hash"] = normalized["_hash"]
            verdict["_value_eth"] = normalized["_value_eth"]
            verdict["_from"] = normalized["_from"]
            verdict["_to"] = normalized["_to"]
            verdict["_timestamp"] = normalized["_timestamp"]
            verdict["_is_inbound"] = normalized["_is_inbound"]
            if verdict["is_anomaly"]:
                flagged += 1
            results.append(verdict)

        results.sort(key=lambda r: r["risk_score"], reverse=True)
        return {
            "address": address,
            "transactions": results,
            "summary": {
                "total": len(results),
                "flagged": flagged,
                "max_risk": results[0]["risk_score"] if results else 0,
            },
        }

    # ── UPI CSV/bank statement upload ─────────────────────────────────────────

    @app.post("/analyze/upi/upload")
    async def analyze_upi_upload(file: UploadFile = File(...)):
        """Upload a bank statement CSV — analyzes every UPI transaction in it."""
        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=422, detail="Only CSV files supported. Export your bank statement as CSV.")

        content = await file.read()
        try:
            transactions = parse_upi_csv(content)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))

        results = []
        flagged = 0
        for txn in transactions:
            event = upi_adapter.normalize(txn)
            verdict = service.analyze_now(event)
            verdict["_description"] = txn.get("_description", "")
            verdict["_amount_inr"] = txn.get("amount_inr", 0)
            verdict["_row"] = txn.get("_row", 0)
            if verdict["is_anomaly"]:
                flagged += 1
            results.append(verdict)

        results.sort(key=lambda r: r["risk_score"], reverse=True)
        return {
            "filename": file.filename,
            "transactions": results,
            "summary": {
                "total": len(results),
                "flagged": flagged,
                "safe": len(results) - flagged,
                "max_risk": results[0]["risk_score"] if results else 0,
            },
        }

    # ── live UPI webhook (Razorpay) ───────────────────────────────────────────

    @app.post("/webhook/upi")
    async def upi_webhook(request: Request):
        """Receives UPI payment.captured events from Razorpay sandbox.

        Verifies the Razorpay HMAC-SHA256 signature, normalises the payload
        through UPIAdapter, and pushes it into the anomaly engine.
        """
        import hmac as _hmac, hashlib as _hashlib

        body = await request.body()
        sig = request.headers.get("X-Razorpay-Signature", "")
        webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "sentinelaihack2026")

        # Verify signature when present (skip for manual test POSTs)
        if sig:
            expected = _hmac.new(
                webhook_secret.encode(), body, _hashlib.sha256
            ).hexdigest()
            if not _hmac.compare_digest(expected, sig):
                raise HTTPException(status_code=403, detail="Invalid webhook signature")

        try:
            raw = __import__("json").loads(body)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

        try:
            event = upi_adapter.normalize(raw)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Normalisation failed: {exc}")

        await service._on_raw_event(event)
        logger.info("Razorpay UPI webhook: entity=%s", event.entity_id)
        return {"ok": True, "entity_id": event.entity_id, "source": "upi"}

    # ── Real user-driven analysis endpoints ───────────────────────────────────

    @app.post("/analyze/upi")
    async def analyze_upi(request: Request):
        """Analyze a real UPI transaction. Returns risk score + AI explanation."""
        raw = await request.json()
        # Accept both Razorpay webhook format and direct simple format
        if "vpa" not in raw and "payload" not in raw:
            raise HTTPException(status_code=422, detail="Missing 'vpa' or Razorpay payload")
        try:
            event = upi_adapter.normalize(raw)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        return service.analyze_now(event)

    @app.post("/analyze/database")
    async def analyze_database(request: Request):
        """Analyze database activity for a user. Returns risk score + AI explanation."""
        raw = await request.json()
        try:
            event = db_adapter.normalize(raw)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        return service.analyze_now(event)

    @app.post("/analyze/transaction")
    async def analyze_transaction(request: Request):
        """Analyze a payment transaction. Returns risk score + AI explanation."""
        raw = await request.json()
        try:
            event = txn_adapter.normalize(raw)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        return service.analyze_now(event)

    @app.post("/analyze/auth")
    async def analyze_auth(request: Request):
        """Analyze a login/auth event. Returns risk score + AI explanation."""
        raw = await request.json()
        try:
            event = auth_adapter.normalize(raw)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        return service.analyze_now(event)

    # ── WebSocket ──────────────────────────────────────────────────────────────

    @app.websocket("/ws")
    async def ws(websocket: WebSocket):
        await websocket.accept()
        service.add_client(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            service.remove_client(websocket)
        except Exception:
            service.remove_client(websocket)

    return app


def run() -> None:  # pragma: no cover
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(create_app(), host=host, port=port)


if __name__ == "__main__":  # pragma: no cover
    run()
