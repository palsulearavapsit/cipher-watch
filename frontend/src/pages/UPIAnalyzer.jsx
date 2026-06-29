import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const RISK_COLOR = (s) => s >= 80 ? "#ef4444" : s >= 50 ? "#f59e0b" : "#22c55e";
const RISK_LABEL = (s) => s >= 80 ? "HIGH RISK — FRAUDULENT" : s >= 50 ? "MEDIUM RISK — SUSPICIOUS" : "LOW RISK — NORMAL";
const RISK_BG = (s) => s >= 80 ? "bg-red-500/20 text-red-400 border-red-500/30" : s >= 50 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-green-500/20 text-green-400 border-green-500/30";

export default function UPIAnalyzer() {
  const [mode, setMode] = useState("single"); // "single" | "upload"
  const [form, setForm] = useState({ vpa: "", payee_vpa: "", amount_inr: "", count_in_window: "1" });
  const [result, setResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const analyzeSingle = async () => {
    if (!form.vpa || !form.amount_inr) { setError("UPI ID and Amount are required."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API}/analyze/upi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpa: form.vpa, payee_vpa: form.payee_vpa || "unknown@upi", amount_inr: parseFloat(form.amount_inr), count_in_window: parseInt(form.count_in_window) || 1 }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || `Error ${res.status}`);
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const analyzeUpload = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) { setError("Only CSV files supported. Export your bank statement as CSV from your banking app."); return; }
    setLoading(true); setError(null); setBatchResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/analyze/upi/upload`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).detail || `Error ${res.status}`);
      setBatchResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 max-w-3xl">
      <header>
        <h2 className="text-xl font-bold tracking-tight text-text">UPI Transaction Analyzer</h2>
        <p className="mt-1 text-[12px] text-faint">
          Analyze a single transaction or upload your entire bank statement CSV — CipherWatch scans all UPI transactions instantly.
        </p>
      </header>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-line bg-surface p-1 gap-1 w-fit">
        {[["single", "Single Transaction"], ["upload", "Upload Bank Statement"]].map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setError(null); setResult(null); setBatchResult(null); }}
            className={`px-4 py-2 rounded-md text-[12px] font-medium transition ${mode === m ? "bg-calm/20 text-calm" : "text-faint hover:text-text"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Single transaction mode */}
      {mode === "single" && (
        <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <Field label="Your UPI ID" placeholder="e.g. rohit.sharma@okicici" value={form.vpa} onChange={(v) => set("vpa", v)} />
          <Field label="Payee UPI ID" placeholder="e.g. merchant@paytm" value={form.payee_vpa} onChange={(v) => set("payee_vpa", v)} />
          <Field label="Amount (₹)" placeholder="e.g. 45000" value={form.amount_inr} onChange={(v) => set("amount_inr", v)} type="number" />
          <Field label="Transactions in last hour" placeholder="e.g. 1" value={form.count_in_window} onChange={(v) => set("count_in_window", v)} type="number" />
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <button onClick={analyzeSingle} disabled={loading}
            className="w-full rounded-lg bg-calm/10 border border-calm/30 py-3 text-[13px] font-semibold text-calm hover:bg-calm/20 disabled:opacity-50 transition">
            {loading ? "Analyzing…" : "Analyze Transaction →"}
          </button>
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div className="rounded-xl border-2 border-dashed border-line bg-surface p-8 text-center space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-[14px] font-medium text-text">Upload your bank statement CSV</p>
            <p className="text-[11px] text-faint mt-1">Export from HDFC / ICICI / SBI / Axis / Paytm / PhonePe → Save as CSV</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => analyzeUpload(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={loading}
            className="rounded-lg bg-calm/10 border border-calm/30 px-6 py-2.5 text-[13px] font-semibold text-calm hover:bg-calm/20 disabled:opacity-50 transition">
            {loading ? "Scanning all transactions…" : "Choose CSV File →"}
          </button>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <p className="text-[10px] text-faint">Your data never leaves your machine — analyzed locally via your own backend</p>
        </div>
      )}

      {/* Single result */}
      {result && <SingleResult result={result} />}

      {/* Batch results */}
      {batchResult && <BatchResults data={batchResult} />}
    </div>
  );
}

function SingleResult({ result }) {
  const color = RISK_COLOR(result.risk_score);
  return (
    <div className="rounded-xl border bg-surface p-5 space-y-4" style={{ borderColor: color + "44" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-faint">Risk Score</div>
          <div className="tabnum text-4xl font-bold mt-1" style={{ color }}>{result.risk_score}<span className="text-lg text-faint">/100</span></div>
        </div>
        <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color, background: color + "22" }}>
          {RISK_LABEL(result.risk_score)}
        </span>
      </div>
      {result.explanation && (
        <div className="rounded-lg border border-line bg-ink p-3">
          <div className="text-[10px] uppercase tracking-widest text-faint mb-1">AI Explanation</div>
          <p className="text-[13px] text-text leading-relaxed whitespace-pre-line">{result.explanation}</p>
        </div>
      )}
      {result.tripped_features?.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-faint mb-1">Anomalous Signals</div>
          {result.tripped_features.map((f, i) => (
            <div key={i} className="flex justify-between rounded bg-ink px-3 py-1.5 text-[11px]">
              <span className="text-muted">{f.name}</span>
              <span className="tabnum text-threat">{f.deviation}</span>
            </div>
          ))}
        </div>
      )}
      {result.is_anomaly && <p className="text-[10px] text-faint">Logged to Firebase Threat Logs automatically.</p>}
    </div>
  );
}

function BatchResults({ data }) {
  const { summary, transactions, filename } = data;
  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Pill label="Total Scanned" value={summary.total} color="text-text" />
        <Pill label="Flagged" value={summary.flagged} color="text-red-400" />
        <Pill label="Safe" value={summary.safe} color="text-green-400" />
        <Pill label="Highest Risk" value={`${summary.max_risk}/100`} color={RISK_COLOR(summary.max_risk)} />
      </div>
      <p className="text-[11px] text-faint">Results from: <span className="text-muted">{filename}</span> — sorted highest risk first</p>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-ink/40">
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Risk</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Description</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Amount (₹)</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {transactions.map((tx, i) => (
              <tr key={i} className={`hover:bg-ink/30 transition-colors ${tx.risk_score >= 80 ? "bg-red-500/5" : ""}`}>
                <td className="px-4 py-3 tabnum font-bold text-[13px]" style={{ color: RISK_COLOR(tx.risk_score) }}>{tx.risk_score}</td>
                <td className="px-4 py-3 text-[12px] text-muted max-w-xs truncate">{tx._description || tx.entity_id}</td>
                <td className="px-4 py-3 tabnum text-[12px] text-text">₹{Number(tx._amount_inr).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${RISK_BG(tx.risk_score)}`}>
                    {tx.risk_score >= 80 ? "Flagged" : tx.risk_score >= 50 ? "Review" : "Safe"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {transactions.filter(t => t.is_anomaly && t.explanation).slice(0, 3).map((tx, i) => (
        <div key={i} className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="text-[10px] uppercase tracking-widest text-red-400 mb-1">Flagged · {tx._description} · Risk {tx.risk_score}/100</div>
          <p className="text-[12px] text-text leading-relaxed">{tx.explanation}</p>
        </div>
      ))}
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

function Pill({ label, value, color }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-2">
      <div className={`tabnum text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-faint">{label}</div>
    </div>
  );
}
