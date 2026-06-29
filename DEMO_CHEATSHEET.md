# CipherWatch — Judge Demo Cheat Sheet

## BEFORE YOU START

Start both servers:

**Terminal 1 — Backend:**
cd "C:\Users\HARSH\OneDrive\Desktop\osf hackathon\backend"
set PYTHONUTF8=1
python -m uvicorn sentinel.api.app:create_app --factory --host 127.0.0.1 --port 8000

Wait ~15 seconds for warmup to complete, then open:

**Terminal 2 — Frontend:**
cd "C:\Users\HARSH\OneDrive\Desktop\osf hackathon\frontend"
npm run dev

Open browser: http://localhost:5173

---

## DEMO FLOW (in this order)

---

### 1. UPI ANALYZER — Single Transaction (30 seconds)

**Say:** "A user gets a suspicious notification on their UPI app. They enter the transaction details."

**Click:** UPI Analyzer in sidebar

**Fill in:**
- Your UPI ID:              priya.v@paytm
- Payee UPI ID:             unknown.payee@paytm
- Amount (₹):               92000
- Transactions in last hour: 47

**Click:** Analyze Transaction

**Expected result:** 100/100 — HIGH RISK — FRAUDULENT
AI will explain: ₹92,000 vs baseline ₹2,219, 47 transactions vs baseline 3, new unknown payee

---

### 2. UPI ANALYZER — Bank Statement Upload (45 seconds)

**Say:** "Or, they can upload their entire bank statement and we scan ALL transactions at once."

**Click:** "Upload Bank Statement" tab

**Upload:** demo_bank_statement.csv (on your Desktop → osf hackathon folder)

**Expected result:**
- 23 total transactions scanned
- 3 flagged (the ₹87,500 / ₹65,000 / ₹92,000 transfers to unknown.payee@paytm)
- 20 safe (all the food/shopping transactions)

**Point out:** "Normal Zomato orders — safe. Large transfers to unknown payee — flagged. Every transaction scored in under 2 seconds."

---

### 3. DATABASE ANALYZER (30 seconds)

**Say:** "Now same engine, different source. A developer wants to check if a service account is behaving normally."

**Click:** DB Analyzer

**Fill in:**
- User / Service ID:     svc_billing
- Table Name:            payments
- Write Count:           450
- Delete Count:          200

**Click:** Analyze Activity

**Expected result:** 100/100 — HIGH RISK — EXFILTRATION
AI will explain: 450 writes vs baseline 4.5, 200 deletes vs baseline 1.5

**Normal comparison (optional):**
- Write Count: 3, Delete Count: 1 → shows LOW RISK — NORMAL

---

### 4. BLOCKCHAIN MONITOR (45 seconds)

**Say:** "And for crypto — paste any Ethereum wallet address. We pull their real transaction history from Etherscan and score each one live."

**Click:** Blockchain in sidebar

**Paste this wallet:** 0xd8da6bf26964af9d7eed9e03e53415d37aa96045

**Click:** Analyze Wallet

**Expected result:** 30 real transactions fetched from Etherscan, each scored
- Clickable TX hashes linking to etherscan.io
- Real from/to addresses, real amounts, real timestamps

**Point out:** "This is Vitalik Buterin's actual Ethereum wallet. Every transaction is real, fetched live from Etherscan right now."

---

### 5. THREAT LOGS (15 seconds)

**Click:** Threat Logs

**Point out:**
- "Every flagged transaction is automatically saved to Firebase — our cloud database"
- "Any analyst on the team can open this from any browser, anywhere in the world"
- "Score, threat type, AI explanation, timestamp — all persisted in real time"

---

## KEY LINES TO SAY

- "One engine. Five data sources. Same anomaly detection logic for all of them."
- "The AI doesn't just give a number — it explains exactly WHY the transaction is suspicious."
- "Everything flagged goes straight to Firebase. The security team sees it instantly."
- "This isn't a rules engine. It learns each entity's normal behavior and flags deviations."

---

## IF SOMETHING GOES WRONG

Backend down: restart it (Terminal 1 command above), wait 15 seconds
Frontend white screen: refresh browser
Blockchain error: try wallet 0xab5801a7d398351b8be11c439e05c5b3259aec9b instead
DB shows 0 risk: enter bigger numbers (write_count: 1000, delete_count: 500)
