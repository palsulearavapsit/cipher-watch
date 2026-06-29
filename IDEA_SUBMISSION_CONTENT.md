# RTMTS Scanner — powered by SentinelAI
## OSF Hackathon · Idea Submission — Content Master (handoff to Claude Design)

> **How to use this file:** This is the *content source* for the idea-submission deck.
> Hand this file **plus** `OSF HACKONE PPT TEMPLATE 2k26.pptx` to Claude Design.
> Every section below maps 1:1 to a slide in that template. Text is already trimmed
> to bullet form (template rule: no long paragraphs). Design direction is at the bottom.
>
> **Deck rules (from the template's "Important Pointers" slide):**
> - **Max 6 slides total, including the title slide.** (Build slides 1–6 below. Do **not** include the "Important Pointers" slide in the final upload.)
> - File **must be < 5 MB** · Export and upload as **PDF only** · Use the provided template only.
> - Favor bullets, diagrams, infographics, screenshots — avoid long paragraphs.

---

## ⚠️ FILL-IN CHECKLIST (portal/admin fields — only you can supply these)

These come from your hackathon registration portal. I've put smart suggestions where I can,
but **replace every `[ ]` before submitting.**

| Field | Value to enter |
|---|---|
| Theme | `[ ]` *(suggested: Cybersecurity & FinTech — Threat Intelligence / Fraud Detection)* |
| Problem Statement ID | `[ ]` *(from portal)* |
| Problem Statement Category | `[ ]` *(suggested: Software)* |
| Team ID | `[ ]` *(from portal)* |
| Team Name (as registered) | `[ ]` |
| Team members (names/roles) | `[ ]` *(optional, if the title slide has room)* |

Everything else below is fully written and ready.

---

# SLIDE 1 — IDEA SUBMISSION  *(Title slide)*

**Theme —** `[FILL FROM PORTAL]`
**Problem Statement ID —** `[FILL FROM PORTAL]`
**Problem Statement Category —** `[FILL FROM PORTAL]`
**Team ID —** `[FILL FROM PORTAL]`
**Team Name (Registered on portal) —** `[FILL FROM PORTAL]`

**Project / Idea name (big, center):** **RTMTS Scanner**
**Sub-line:** *Real-Time Threat Monitoring System — powered by the SentinelAI engine*
**Tagline (one line):** *"Detects the threat. Scores the risk. Explains itself — in real time."*

---

# SLIDE 2 — IDEA TITLE  *(Solution Overview)*

**Idea Title:** **RTMTS Scanner — A Real-Time, Source-Agnostic Threat-Detection Platform that Explains Every Alert**

### Description of the idea / working prototype
- RTMTS Scanner watches **every activity stream** in an organization — payments, logins, database queries, and blockchain wallet transfers — on **one unified engine**.
- It **learns each entity's own "normal"** (per user, account, wallet) and flags suspicious deviations **the instant they happen**, each with a **0–100 risk score** and a **plain-English reason**.
- **This is a working prototype, not a concept:** a live SOC dashboard + a Python/FastAPI detection engine. A traffic simulator streams normal activity; an analyst presses **"inject attack"** and within **~1–2 seconds** the system flags the entity, scores it, and explains why. *(63 automated backend tests passing.)*

### How the approach resolves the problem
- **The problem:** breaches and fraud hide inside high-volume streams. Legacy tools fire **static-threshold alerts** and dump **raw rows with no context**, so analysts drown in noise and catch the attack *after* the damage.
- **Our fix:** replace fixed thresholds with **per-entity behavioral baselines** → catches **novel** attacks, not just known signatures. Every alert arrives **pre-explained**, so analysts triage in **seconds, not minutes** — directly cutting alert fatigue and response time.

### What makes it novel / creative / distinct
- **Source-agnostic by construction.** Every input is flattened to one `NormalizedEvent {source, entity_id, timestamp, features}` **before** it reaches the engine. The engine never knows whether a signal came from a card swipe or a crypto wallet. **Adding a new source = one small adapter file.** → A *platform*, not just another dashboard.
- **Explainable by default.** A Gemini layer turns a raw anomaly into a sentence a human repeats out loud — e.g. *"Flagged: volume 8× this account's baseline • login from new geography."* **Cached + template fallback = works offline.**
- **Two-layer detection, one intuitive score.** Fast statistical layer (rolling μ/σ) catches sharp spikes live; ML IsolationForest catches subtle drift. Fused into a single 0–100 risk score.

---

# SLIDE 3 — SOLUTION APPROACH

### Technologies used
- **Frontend / Dashboard:** React 18, Vite, Tailwind CSS v4, Recharts — live dark "security-console" UI.
- **Backend / Real-time engine:** Python 3, FastAPI, WebSockets (sub-second push).
- **Detection / ML:** scikit-learn **IsolationForest** + **statistical rolling mean/std** (NumPy); fused 0–100 risk score.
- **AI explanation:** Google **Gemini** — cached responses + deterministic template fallback (offline-safe).
- **Architecture core:** source-agnostic **NormalizedEvent bus**, per-entity behavioral baselines, in-memory hot store.
- **Optional module:** Blockchain wallet monitor via Etherscan/Alchemy API — feature-flagged (`ENABLE_BLOCKCHAIN`), plugs in through one adapter, changes nothing downstream.

### Methodology — detection pipeline *(render as a 6-step horizontal flow diagram)*
1. **INGEST** — each source → its adapter → one `NormalizedEvent {source, entity_id, timestamp, features}`.
2. **BASELINE** — engine keeps a rolling behavioral profile per entity (warm-up seeded before go-live).
3. **DETECT** — statistical spike check **+** IsolationForest drift check → **fused 0–100 risk score**.
4. **EXPLAIN** — Gemini converts the anomaly + features into a plain-English reason (cache → fallback).
5. **STREAM** — verdict pushed over WebSocket to the live dashboard (risk score, reason, source tag).
6. **ACT** — analyst sees the flagged entity in **Threat Logs / Blockchain Monitor** and triages instantly.

> **Working-prototype evidence — insert the three live screenshots here:**
> ① **SOC Dashboard** (threats detected, risk distribution, threats-over-time) · ② **Threat Logs** (scored events: Wallet Fraud 92, DB Attack, DDoS, Brute Force…) · ③ **Blockchain Monitor** (flagged/normal/review wallet activity).

---

# SLIDE 4 — FEASIBILITY AND VIABILITY

### Feasibility of the idea
- **Already built and demoable today** — live dashboard, real-time engine, attack-on-cue, plain-English explanations, **63 passing tests**. A running system, not a slide.
- **Lean 2-service architecture** (React ↔ FastAPI) — runs on a **single laptop**, no cloud dependency on the demo path.
- Built entirely on **proven, free / open-source components** (scikit-learn, FastAPI, React) — no exotic or costly infrastructure.

### Potential challenges & risks  →  Strategy to overcome
- **Live-demo reliability (bad wifi):** Gemini responses **cached + template fallback**; engine binds `localhost`; demo is **fully offline-safe**.
- **ML cold-start (needs history):** **warm-up seeding** builds baselines before the demo; the fast statistical layer carries the live spike.
- **False positives:** per-entity baselines + two-layer fusion + tunable threshold; the baseline **does not learn from confirmed anomalies** (prevents an attack from being "normalized" over time).
- **Scaling to production volume:** stateless engine + normalized bus designed to **shard per entity**; in-memory store is swappable for a real datastore.
- **Securing the security product itself:** we ran an **OWASP-style self-audit** (`SECURITY.md`) → **no critical/high issues** — secrets held in env vars, bounded/validated input, no injection sinks, failure isolation so a fault never crashes the demo.

---

# SLIDE 5 — IMPACT AND BENEFITS

### Target audience
Banks & fintechs · SOC / security operations teams · crypto exchanges & wallet providers · **any organization with high-volume activity streams to defend.**

### Potential impact
- **Detection time: hours/days → ~1–2 seconds** — catch fraud and breaches **before** the damage.
- **Triage time slashed** — every alert is pre-explained, cutting analyst alert-fatigue.
- **Catches novel / zero-day behavior**, not just known signatures.

### Benefits
- **Economic —** reduces fraud losses, chargebacks, and breach-remediation cost; fewer analyst-hours per alert; **one platform replaces several point tools**.
- **Social / trust —** protects customers' money and data; faster response means less harm; supports safer digital finance.
- **Operational —** one engine for all sources = lower integration and maintenance cost; a brand-new data source is onboarded with **a single adapter**.
- **Efficiency / environmental —** lean architecture with an in-memory hot path = **low compute footprint** vs. heavy traditional SIEM stacks.

---

# SLIDE 6 — RESEARCH AND REFERENCES

- **Isolation Forest** — F. T. Liu, K. M. Ting, Z.-H. Zhou, *"Isolation Forest,"* IEEE ICDM 2008. *(core anomaly-detection algorithm)*
- **scikit-learn** — IsolationForest & novelty/outlier detection documentation. <https://scikit-learn.org>
- **UEBA** — User & Entity Behavior Analytics: per-entity behavioral baselining (industry concept underpinning the engine).
- **OWASP Top 10 (2021)** — framework used for our security self-audit. <https://owasp.org/Top10/>
- **FastAPI** <https://fastapi.tiangolo.com> · **React** <https://react.dev> · **Recharts** <https://recharts.org> · **Tailwind CSS** <https://tailwindcss.com>
- **Google Gemini API** — explanation layer. <https://ai.google.dev>
- **Etherscan / Alchemy APIs** — blockchain wallet-activity module (optional).
- *(Validation roadmap)* public fraud datasets — e.g. IEEE-CIS Fraud Detection / credit-card fraud (Kaggle) for benchmarking.

> Replace/trim to the references you actually want to cite; keep ~5–7 high-credibility ones.

---

# 🎨 DESIGN DIRECTION (for Claude Design — not a slide)

**Identity:** RTMTS Scanner — powered by SentinelAI · a dark, premium **security-console** look that matches the live UI.

**Palette (match the working dashboard):**
- Background: near-black / deep navy (`#0B0F1A` → `#0E1320`).
- Primary accent: **cyan / teal** (`#22D3EE` / `#06B6D4`) — the "RTMTS" brand cyan.
- Risk semantics (reuse everywhere): **High/Flagged = red** (`#EF4444`), **Medium/Review = amber** (`#F59E0B`), **Low/Normal = green** (`#22C55E`).
- Text: off-white (`#E5E7EB`) on dark; muted gray for captions.

**Motif (pick ONE, repeat it):** a small **shield icon** + **risk-score chips** (the rounded score pills from Threat Logs). No accent stripes / no underlines-under-titles.

**Layout cues per slide:**
- **S1 Title:** dark hero, big "RTMTS Scanner", tagline, admin fields in a clean left-aligned block.
- **S2 Overview:** two columns — left = description + "how it resolves"; right = the 3 "novel" points as icon rows.
- **S3 Approach:** top = tech stack as labeled chips; middle = the **6-step pipeline flow diagram**; bottom strip = the 3 live screenshots.
- **S4 Feasibility:** two columns — "Feasible because…" vs. a **Risk → Mitigation** table.
- **S5 Impact:** big stat callouts (`~1–2s detection`, `1 adapter = new source`) + benefit icon rows.
- **S6 References:** clean two-column list, muted, citation style.

**Assets to embed:** the three dashboard screenshots (Dashboard, Threat Logs, Blockchain Monitor). Compress them so the final PDF stays **< 5 MB**.

**Tone:** confident, concrete, builder-credible. The hook judges should leave with:
**"Source-agnostic. Real-time. Explains every alert. And it already works."**
