// Backend endpoints. The dashboard (Vite :5173) talks to the FastAPI service (:8000).
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const WS_URL = (import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws");

export async function fetchEntities() {
  const res = await fetch(`${API_BASE}/entities`);
  if (!res.ok) throw new Error(`/entities ${res.status}`);
  return res.json(); // { entities: [...], attacks: [...] }
}

export async function injectAttack(kind, entityId, burst = 20) {
  const res = await fetch(`${API_BASE}/inject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, entity_id: entityId, burst }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail ?? `inject ${res.status}`);
  }
  return res.json();
}

export function connectStream(onMessage, onStatus) {
  let ws;
  let closed = false;
  let retry;

  const open = () => {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => onStatus?.(true);
    ws.onclose = () => {
      onStatus?.(false);
      if (!closed) retry = setTimeout(open, 1000); // auto-reconnect
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch {
        /* ignore malformed frame */
      }
    };
  };
  open();

  return () => {
    closed = true;
    clearTimeout(retry);
    ws?.close();
  };
}

export async function injectUPIAttack() {
  const res = await fetch(`${API_BASE}/inject/upi`, { method: "POST" });
  if (!res.ok) throw new Error(`inject/upi ${res.status}`);
  return res.json();
}

export async function injectBlockchainAttack() {
  const res = await fetch(`${API_BASE}/inject/blockchain`, { method: "POST" });
  if (!res.ok) throw new Error(`inject/blockchain ${res.status}`);
  return res.json();
}

export const SOURCE_META = {
  transaction: { label: "TXN", color: "var(--color-txn)" },
  auth: { label: "AUTH", color: "var(--color-auth)" },
  database: { label: "DB", color: "var(--color-db)" },
  blockchain: { label: "CHAIN", color: "var(--color-calm)" },
  upi: { label: "UPI", color: "#f59e0b" },
};
