import { useState } from "react";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const RISK_COLOR = (s) => s >= 80 ? "#ef4444" : s >= 50 ? "#f59e0b" : "#22c55e";
const RISK_LABEL = (s) => s >= 80 ? "HIGH RISK — EXFILTRATION" : s >= 50 ? "MEDIUM RISK — UNUSUAL" : "LOW RISK — NORMAL";

export default function DatabaseAnalyzer() {
  const [form, setForm] = useState({ user_id: "", write_count: "0", delete_count: "0", table: "users" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const analyze = async () => {
    if (!form.user_id) { setError("User ID is required."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API}/analyze/database`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: form.user_id,
          write_count: parseInt(form.write_count) || 0,
          delete_count: parseInt(form.delete_count) || 0,
          table: form.table,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 max-w-2xl">
      <header>
        <h2 className="text-xl font-bold tracking-tight text-text">Database Activity Analyzer</h2>
        <p className="mt-1 text-[12px] text-faint">
          Enter a user's database activity — detect exfiltration, mass deletes, or abnormal write patterns.
        </p>
      </header>

      <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <Field label="User / Service ID" placeholder="e.g. user_123 or svc_billing" value={form.user_id} onChange={(v) => set("user_id", v)} />
        <Field label="Table Name" placeholder="e.g. users, payments, orders" value={form.table} onChange={(v) => set("table", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Write Count (last hour)" placeholder="e.g. 5" value={form.write_count} onChange={(v) => set("write_count", v)} type="number" />
          <Field label="Delete Count (last hour)" placeholder="e.g. 0" value={form.delete_count} onChange={(v) => set("delete_count", v)} type="number" />
        </div>

        {error && <p className="text-[12px] text-red-400">{error}</p>}

        <button
          onClick={analyze}
          disabled={loading}
          className="w-full rounded-lg bg-calm/10 border border-calm/30 py-3 text-[13px] font-semibold text-calm hover:bg-calm/20 disabled:opacity-50 transition"
        >
          {loading ? "Analyzing…" : "Analyze Activity →"}
        </button>
      </div>

      {result && <ResultCard result={result} />}
    </div>
  );
}

function Field({ label, placeholder, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-faint mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-[13px] text-text outline-none focus:border-calm" />
    </div>
  );
}

function ResultCard({ result }) {
  const color = RISK_COLOR(result.risk_score);
  return (
    <div className="rounded-xl border bg-surface p-5 space-y-4" style={{ borderColor: color + "44" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-faint">Risk Score</div>
          <div className="tabnum text-4xl font-bold mt-1" style={{ color }}>{result.risk_score}<span className="text-lg text-faint">/100</span></div>
        </div>
        <div className="text-right">
          <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color, background: color + "22" }}>
            {RISK_LABEL(result.risk_score)}
          </span>
          <div className="mt-1 text-[10px] text-faint">{result.entity_id}</div>
        </div>
      </div>
      {result.explanation && (
        <div className="rounded-lg border border-line bg-ink p-3">
          <div className="text-[10px] uppercase tracking-widest text-faint mb-1">AI Explanation</div>
          <p className="text-[13px] text-text leading-relaxed whitespace-pre-line">{result.explanation}</p>
        </div>
      )}
      {result.tripped_features?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-faint mb-2">Anomalous Signals</div>
          {result.tripped_features.map((f, i) => (
            <div key={i} className="flex justify-between rounded bg-ink px-3 py-1.5 text-[11px] mb-1">
              <span className="text-muted">{f.name}</span>
              <span className="tabnum text-threat">{f.deviation}</span>
            </div>
          ))}
        </div>
      )}
      {result.is_anomaly && <p className="text-[11px] text-faint">Logged to Firebase Threat Logs automatically.</p>}
    </div>
  );
}
