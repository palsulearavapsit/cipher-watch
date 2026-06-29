# SentinelAI

Real-time, source-agnostic threat-intelligence and anomaly-detection platform.

Every input (a transaction, a database query, a login, optionally a blockchain transfer)
is flattened to one `NormalizedEvent` before it touches the engine. The anomaly engine is
**source-blind**: it learns each entity's normal behaviour and flags deviations in real time
with a plain-English reason and a risk score. Adding a source = writing one adapter.

## Architecture (round-1, lean 2-service)

```
React + Tailwind + Recharts  ──ws/REST──►  Python / FastAPI service
 (live dashboard)                            ├─ traffic simulator (normal + attack injection)
                                             ├─ normalized event bus (source-blind)
                                             ├─ anomaly engine (rolling μ/σ + IsolationForest)
                                             ├─ Gemini explanation (cache + template fallback)
                                             └─ in-memory store
```

Blockchain is an isolated optional experiment behind `ENABLE_BLOCKCHAIN=false`.

## Layout

```
backend/
  sentinel/
    core/       NormalizedEvent contract + in-memory event bus
    adapters/   one small module per source (transaction = reference impl)
    sim/        traffic simulator: warm-up, normal stream, attack injection
  tests/        unit + integration (pytest)
frontend/       React dashboard (later)
```

## Develop

```bash
cd backend
python -m pytest          # run the test suite
```

Phase 0 (the contract spine + simulator) uses only the Python standard library + pytest.
Later phases add: `scikit-learn`, `fastapi`, `uvicorn`, `google-generativeai` (see
`backend/requirements.txt`).

## Status

Phase 0 — normalized-event contract spine + traffic simulator. See
`~/.gstack/projects/osfhackathon/` for the design doc, build plan, and spec.
