# SentinelAI — Security Posture (self-audit)

We build a security product, so we ran an OWASP-style audit on our own platform.
Scope: the round-1 prototype's only network-facing surface, the FastAPI service
(`backend/sentinel/api/`). Reviewed 2026-06-23.

## Threat model (round 1)

The prototype runs locally for a live demo. There is no untrusted multi-tenant
traffic and no real customer data — events come from the simulator. The audit
therefore focuses on (a) not leaking the one secret we hold (the Gemini key),
(b) not exposing the demo box, (c) safe input handling, and (d) the forward-looking
risks that appear the moment real adapter data flows in.

## Findings

| # | Area | OWASP | Finding | Status |
|---|------|-------|---------|--------|
| 1 | Secrets | A07 | `GEMINI_API_KEY` is read from the environment (`os.environ.get`), never hardcoded. `.env` is gitignored; `.env.example` ships empty. | Clean |
| 2 | Network exposure | A05 | `run()` binds `127.0.0.1` by default (override via `HOST`). The demo box is not exposed on conference wifi. | Safe default |
| 3 | Input validation | A03 | `POST /inject` is pydantic-validated; `burst` is bounded `[1, 500]`; unknown attack kind / entity raise and map to HTTP 400. | Bounded |
| 4 | Injection sinks | A03 | No SQL, shell, `eval`, or template injection. Storage is in-memory. No user input reaches a dangerous sink. | None |
| 5 | CORS | A05 | Restricted to localhost dev origins, methods `GET`/`POST` only — not `*`. | Scoped |
| 6 | Error handling | A04 | 400 responses carry only the validation message. The websocket handler and the Gemini client swallow exceptions so a bad client or a network hiccup never crashes the server or the demo. | No leak |
| 7 | Authentication | A01 | No auth on the HTTP API or websocket. Acceptable for a local single-user demo; **must add auth + TLS before any non-local deployment.** | Documented |
| 8 | XSS (forward-looking) | A03 | Explanation text and feature values are safe today (simulated data), but become attacker-influenced once real adapters ingest live geo/IP/table strings. The dashboard MUST render them as escaped text (React escapes by default) and MUST NOT use `dangerouslySetInnerHTML`. | Note for dashboard |
| 9 | Dependency / SDK | A06 | `google-generativeai` is deprecated and off by default. If the live Gemini path is enabled, migrate to `google-genai`. | Note |

## Posture

No CRITICAL or HIGH issues. The service is secure-by-default for its intended use
(a local demo): localhost binding, environment-held secret, bounded validated input,
no injection sinks, and failure isolation so security or network faults never take
the demo down. The two forward-looking items (no-auth is local-only; the dashboard
must escape rendered strings) are tracked for the deployment and dashboard phases.
