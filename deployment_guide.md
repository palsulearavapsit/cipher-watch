# 🚀 Deployment Guide: Vercel & Render

This guide outlines how to deploy the **CipherWatch** platform in production:
1.  **FastAPI Backend** hosted on **Render** (supports Python, WebSockets, background tasks, and Firestore).
2.  **React Frontend** hosted on **Vercel** (supports high-performance static hosting for Single Page Apps).

---

## 🖥️ Backend Deployment on Render

Render is an ideal, developer-friendly hosting service for the FastAPI Python service.

### Step 1: Create a Render Web Service
1.  Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
2.  Connect your GitHub repository.
3.  Configure the service details:
    *   **Name:** `cipherwatch-backend`
    *   **Runtime:** `Python`
    *   **Root Directory:** `backend` *(This tells Render to look inside the backend folder for code)*
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `uvicorn sentinel.api.app:create_app --factory --host 0.0.0.0 --port $PORT`

### Step 2: Upload Firebase Service Account Credentials
Since your backend connects to Firestore, it requires the secret service account JSON file. Render lets you inject files securely via **Secret Files**:
1.  Go to the **Environment** tab of your service settings on Render.
2.  Under **Secret Files**, click **Add Secret File**.
3.  Name the file: `/secrets/firebase-sa.json`
4.  Paste the complete contents of your `sentinel-firebase-sa.json` credential file inside it and save.

### Step 3: Configure Environment Variables
In the same **Environment** tab, click **Add Environment Variable** to add the following keys from your `.env`:

| Environment Variable | Recommended Value / Source |
| :--- | :--- |
| `PYTHONUTF8` | `1` |
| `FIREBASE_CREDENTIALS_PATH` | `/secrets/firebase-sa.json` *(Points to Render's secret file)* |
| `ENABLE_GEMINI` | `true` |
| `GEMINI_API_KEY` | `sk-live-d8f9...` |
| `ENABLE_BLOCKCHAIN` | `true` |
| `ETHERSCAN_API_KEY` | `5TUK65N...` |
| `WATCHED_WALLETS` | `0xd8da6bf26964af9d7eed9e03e53415d37aa96045,0xab5801a7d398351b8be11c439e05c5b3259aec9b` |
| `RAZORPAY_KEY_ID` | `rzp_test_T7Qw68jfgXI09g` |
| `RAZORPAY_KEY_SECRET` | `k6DKL52LyV0QKoPRqA0cDyQ2` |
| `RAZORPAY_WEBHOOK_SECRET` | `sentinelaihack2026` |

Click **Save Changes**. Render will automatically build and deploy your backend. It will provide a URL like: `https://cipherwatch-backend.onrender.com`.

---

## 🎨 Frontend Deployment on Vercel

Vercel provides blazing-fast global deployment for Vite + React frontends.

### Step 1: Create a Vercel Project
1.  Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** → **Project**.
2.  Import your GitHub repository.
3.  Configure the build settings:
    *   **Framework Preset:** `Vite`
    *   **Root Directory:** `frontend` *(This tells Vercel to build the React application inside the frontend folder)*
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`

### Step 2: Configure Environment Variables
Under the **Environment Variables** accordion, add the variables that link Vercel to your deployed Render backend:

*   **VITE_API_BASE:** `https://your-render-backend-url.onrender.com`
*   **VITE_WS_URL:** `wss://your-render-backend-url.onrender.com/ws`

> [!IMPORTANT]
> Make sure to replace `https://your-render-backend-url.onrender.com` with the actual URL provided by Render. Notice that the WebSocket URL (`VITE_WS_URL`) uses the secure WebSocket protocol prefix **`wss://`** and suffix **`/ws`**.

### Step 3: Deploy
Click **Deploy**. Vercel will build and publish your frontend. It will provide a production URL (e.g., `https://cipherwatch.vercel.app`).

---

## 🔔 Verifying Webhooks (Optional)
If you are testing live UPI payment webhooks from Razorpay in production:
1.  Log into your Razorpay Dashboard.
2.  Go to **Webhooks** settings.
3.  Change your webhook URL to: `https://your-render-backend-url.onrender.com/webhook/upi`
4.  Ensure the webhook secret matches the `RAZORPAY_WEBHOOK_SECRET` environment variable configured on Render.
