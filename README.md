# 🛡️ CipherWatch

> **Real-Time, Source-Agnostic Threat Intelligence & Automated Remediation Platform.**
> Developed for the Hackathon with a focus on core algorithmic innovation, cross-platform adaptability, and seamless judge demonstrations.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![scikit-learn](https://img.shields.io/badge/ML-scikit--learn-F7931E.svg?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-FFCA28.svg?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Gemini / OpenAI Proxy](https://img.shields.io/badge/AI%20Explainer-GPT--4o--mini%20%2F%20Gemini-412991.svg?style=flat-square)](https://openai.com)

---

## 💡 The Vision & Core Innovation

Modern security ecosystems are fragmented. A team monitoring UPI scams uses one tool, database admins use another, and blockchain analysts use a third. This results in alert fatigue, siloed information, and slow incident response.

**CipherWatch** introduces a **"Source-Blind" anomaly detection paradigm**. By flattening heterogeneous event streams (whether UPI bank transfers, database operations, or Ethereum smart contract calls) into a single, uniform `NormalizedEvent` contract, we decoupling data collection from risk analysis. 

One unified engine analyzes every data source, scores threat probability, generates plain-English AI justifications, and exposes **1-Click automated mitigation actions** to neutralize attacks in real time.

---

## 🛠️ Key Architectural Highlights

### 1. Hybrid Anomaly Engine (Stat + ML)
CipherWatch scores threats by fusing two distinct analytical layers:
*   **Statistical Layer ($70\%$ weight):** Computes rolling mean ($\mu$) and standard deviation ($\sigma$) baselines dynamically. Instantaneous deviations (e.g. transactional rate bursts or massive query counts) trigger immediately, carrying the primary signal.
*   **Machine Learning Layer ($30\%$ weight):** Runs an in-memory `IsolationForest` detector trained per-entity. It identifies multi-dimensional anomalies that traditional static-rule engines miss.

### 2. Score-before-Learn Integrity
To prevent **adversarial pollution**, CipherWatch scores incoming events *before* committing them to the rolling baseline. Confirmed anomalies are excluded from learning, ensuring repeated high-intensity attacks cannot "teach" the engine to accept malicious activity as normal.

### 3. Graceful AI Explanations
Rather than outputting raw risk percentages, CipherWatch utilizes a Generative AI Layer via an OpenAI-compatible/Gemini proxy to translate statistical deviations into 2-3 precise, plain-English bullet points.
> [!NOTE]
> To ensure maximum reliability during live presentations, a local template engine acts as an instant fallback on network latency or API limit issues, preventing the dashboard from going dark.

### 4. Interactive Sandbox Controls
Includes a live **Traffic Simulator** that warms up entity baselines and allows judges to inject active attacks (like credential stuffing, DB exfiltration, or UPI bursts) with a single click.

---

## 🏗️ System Dataflow & Architecture

```
  ┌────────────────────────────────────────────────────────┐
  │                   Heterogeneous Sources                │
  │     (UPI Payments, DB Service Logs, Ethereum Wallets)  │
  └───────────────────────────┬────────────────────────────┘
                              │ [Ingests raw telemetry]
                              ▼
                  ┌───────────────────────┐
                  │ Source-Specific       │
                  │ Adapters              │
                  └───────────┬───────────┘
                              │ [Flattens into standard contract]
                              ▼
                  ┌───────────────────────┐
                  │  NormalizedEvent Bus  │
                  └───────────┬───────────┘
                              │ [Emits events in real time]
                              ▼
                  ┌───────────────────────┐
                  │  AnomalyEngine        │
                  │  (Rolling μ/σ + IF)  │
                  └───────────┬───────────┘
                              │ [Fuses score 0-100]
                              ▼
                  ┌───────────────────────┐
                  │ Explainer (AI Proxy / │
                  │ Local Fallback)       │
                  └───────────┬───────────┘
                              │ [Attaches natural language justification]
                              ▼
                  ┌───────────────────────┐
                  │ Firebase Firestore &  │
                  │ Websocket Server      │
                  └───────────┬───────────┘
                              │ [Broadcasts threat payload]
                              ▼
             ┌─────────────────────────────────┐
             │       React Dashboard           │
             │  • Real-Time Visualizations     │
             │  • 1-Click Mitigation Actions   │
             │  • Security Auto-Lockdown       │
             │  • AI Security Copilot Chat     │
             └─────────────────────────────────┘
```

---

## ⚡ Zero-Hassle Integrated Startup

CipherWatch comes with a single orchestrator script `run.py` at the root that manages all dependencies, environment configurations, API health checks, and process lifespans.

### Run in a Single Command:
```bash
python run.py
```

### What this script does:
1.  **Starts the FastAPI Backend:** Boots Uvicorn and loads the anomaly detection engine.
2.  **Warmup & Health Check:** Polls the backend socket automatically for 15 seconds to ensure baselines are warmed up and healthy.
3.  **Starts the Vite Frontend:** Launches the React client.
4.  **Launches Browser:** Automatically opens the dashboard at [http://localhost:5173](http://localhost:5173).
5.  **Graceful Termination:** Pressing `Ctrl+C` cleanly terminates both backend and frontend processes, leaving no rogue orphan processes.

---

## 🎯 Step-by-Step Judge Demo Flow

To show off the platform's versatility during the judging round, follow this structured demo sequence:

### 1. UPI Analyzer — Single Transaction (30s)
*   **Narrative:** *"A user receives a suspicious payment request on their UPI app and enters transaction details to verify its legitimacy."*
*   **Action:** Click **UPI Analyzer** in the sidebar. Under "Single Transaction", enter:
    *   **Your UPI ID:** `priya.v@paytm`
    *   **Payee UPI ID:** `unknown.payee@paytm`
    *   **Amount (₹):** `92000`
    *   **Transactions in last hour:** `47`
*   **Verdict:** Scored **100/100 (HIGH RISK — FRAUDULENT)**. The AI explainer notes the massive deviation from the baseline of ₹2,219, the burst of 47 transactions against the average of 3, and the transfer to an unencountered payee.

### 2. UPI Analyzer — Bank Statement Batch Scan (45s)
*   **Narrative:** *"Instead of single checks, users can drag and drop their monthly bank statements to audit all history at once."*
*   **Action:** Toggle to the **Upload Bank Statement** tab. Drag & drop the `demo_bank_statement.csv` file.
*   **Verdict:** Scans **23 transactions** instantly:
    *   **20 Safe Transactions:** Standard Zomato, Uber, and shopping transactions are scored green.
    *   **3 Flagged Transactions:** The ₹87.5k, ₹65k, and ₹92k transfers to the unknown payee are flagged as threats.

### 3. Database Analyzer — Service Account Anomalies (30s)
*   **Narrative:** *"Using the exact same engine, we monitor service accounts. A developer wants to see if a system API client has been compromised."*
*   **Action:** Open **DB Analyzer** in the sidebar. Enter:
    *   **User/Service ID:** `svc_billing`
    *   **Table Name:** `payments`
    *   **Write Count:** `450`
    *   **Delete Count:** `200`
*   **Verdict:** Scored **100/100 (HIGH RISK — EXFILTRATION)**. Explains that writing 450 items (baseline 4.5) and deleting 200 items (baseline 1.5) indicates database scraping and exfiltration. Enter values like write `3`, delete `1` to show a **LOW RISK — NORMAL** response.

### 4. Blockchain Monitor — Live Wallet Audits (45s)
*   **Narrative:** *"For crypto transactions, users paste any public Ethereum wallet address. We fetch real transaction logs from Etherscan and score them on the fly."*
*   **Action:** Open **Blockchain** in the sidebar. Paste Vitalik Buterin's ENS address or wallet hash:
    *   `0xd8da6bf26964af9d7eed9e03e53415d37aa96045`
*   **Verdict:** Fetches **30 real transactions** live from the Etherscan API. Each is individually scored with clickable TX hashes linking to etherscan.io, demonstrating real-time web3 surveillance.

### 5. Threat Logs — Persistent Cloud Audit (15s)
*   **Narrative:** *"All anomalous actions are synced instantly to the cloud so security analysts can inspect them globally."*
*   **Action:** Click **Threat Logs** in the sidebar.
*   **Verdict:** Shows a live log table populated directly from **Firebase Firestore**, documenting risk scores, threat categories, AI explanations, and timestamps.

### 6. One-Click Mitigation Actions & Auto-Lockdown
*   **Narrative:** *"Detection is useless without remediation. CipherWatch enables instant response."*
*   **Action:** Go to the **Live Console**. Notice the top banner is red under active threat. 
*   **Mitigation:** In the **Active Threat Hero** card, click **Freeze Account** or **Isolate IP**. The console triggers a loading simulation ticker, marks the incident as mitigated, and transitions to a healthy state.
*   **Auto-Lockdown:** When a critical anomaly (Risk Score $\ge 90$) is detected in the real-time event feed, the UI triggers a global system lockdown overlay, blocking all dashboard interactions until the administrator authenticates.

---

## 📁 Repository Structure

```
CipherWatch/
│
├── run.py                 # Integrated one-click startup runner
├── backend/               # FastAPI Backend Service
│   ├── sentinel/
│   │   ├── core/          # NormalizedEvent contract & in-memory event bus
│   │   ├── adapters/      # Raw payload adapters (UPI, DB, Etherscan)
│   │   ├── engine/        # Hybrid anomaly engine (Statistical + IsolationForest)
│   │   ├── explain/       # AI explainer (OpenAI/Gemini proxy client + template engine)
│   │   ├── sim/           # Mock event simulator (normal traffic + attack injector)
│   │   └── sinks/         # Firebase Firestore sync connector
│   └── tests/             # Pytest unit & integration test suites
│
└── frontend/              # Vite + React Dashboard
    ├── src/
    │   ├── components/    # Reusable widgets (ThreatHero, SpikeChart, CopilotChat)
    │   ├── pages/         # UI pages (UPI, DB, ThreatLogs, Blockchain)
    │   ├── hooks/         # Event sub/unsub hook (useSentinel)
    │   └── context/       # Auth state management
```

---

## 🧪 Local Tests & Verifications

To run the automated Python backend tests verifying event normalization and engine thresholds:

```bash
cd backend
python -m pytest
```

---

*CipherWatch is designed to impress. Zero configuration required to launch, and highly visual inputs to showcase top-tier engineering in front of the judges.*
