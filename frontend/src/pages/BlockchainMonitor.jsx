import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const RISK_COLOR = (s) => s >= 80 ? "#ef4444" : s >= 50 ? "#f59e0b" : "#22c55e";
const RISK_LABEL = (s) => s >= 80 ? "Flagged" : s >= 50 ? "Review" : "Normal";
const RISK_BG = (s) => s >= 80 ? "bg-red-500/20 text-red-400" : s >= 50 ? "bg-orange-500/20 text-orange-400" : "bg-slate-500/20 text-slate-400";

function short(addr) {
  if (!addr || addr.length < 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function fmtEth(val) {
  if (!val && val !== 0) return "—";
  return `${parseFloat(val).toFixed(4)} ETH`;
}

function fmtTime(ts) {
  if (!ts) return "—";
  try { return new Date(parseInt(ts) * 1000).toLocaleString(); } catch { return ts; }
}

export default function BlockchainMonitor() {
  const { user } = useAuth();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const loadDemoData = () => {
    setAddress("0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
    setResult(null);
    setError(null);
  };

  const clearForm = () => {
    setAddress("");
    setResult(null);
    setError(null);
  };

  const analyze = async () => {
    if (!address || !address.startsWith("0x")) {
      setError("Enter a valid Ethereum wallet address starting with 0x");
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API}/analyze/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, limit: 30 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text">Blockchain Monitor</h2>
          <p className="mt-1 text-[12px] text-faint">
            Enter any Ethereum wallet address — we fetch real transactions from Etherscan and score each one for anomalies.
          </p>
        </div>
        {user?.isDemo && (
          <button
            onClick={loadDemoData}
            className="self-start md:self-center px-4 py-2 rounded-lg bg-calm/10 border border-calm/30 text-[12px] font-semibold text-calm hover:bg-calm/20 hover:border-calm hover:shadow-[0_0_12px_rgba(128,255,255,0.15)] transition-all cursor-pointer whitespace-nowrap"
          >
            ⚡ Load Demo Data
          </button>
        )}
      </header>

      <div className="flex gap-3">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x... (your ETH wallet address)"
          className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] text-text outline-none focus:border-calm font-mono"
        />
        <button
          onClick={analyze}
          disabled={loading}
          className="rounded-lg bg-calm/10 border border-calm/30 px-5 py-2.5 text-[13px] font-semibold text-calm hover:bg-calm/20 disabled:opacity-50 transition whitespace-nowrap cursor-pointer"
        >
          {loading ? "Fetching…" : "Analyze Wallet →"}
        </button>
        {(address || result) && (
          <button
            type="button"
            onClick={clearForm}
            className="px-5 py-2.5 rounded-lg border border-line bg-ink text-[13px] font-semibold text-muted hover:text-text hover:bg-surface-2 transition cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-400">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Summary */}
          <div className="flex gap-3 flex-wrap">
            <Pill label="Total Transactions" value={result.summary.total} color="text-text" />
            <Pill label="Flagged" value={result.summary.flagged} color="text-red-400" />
            <Pill label="Safe" value={result.summary.total - result.summary.flagged} color="text-green-400" />
            <Pill label="Highest Risk" value={`${result.summary.max_risk}/100`} color={RISK_COLOR(result.summary.max_risk)} />
          </div>

          {/* Wallet address */}
          <div className="rounded-lg border border-line bg-surface px-4 py-2 text-[11px] font-mono text-faint">
            Wallet: <span className="text-calm">{result.address}</span>
            {" · "}
            <a href={`https://etherscan.io/address/${result.address}`} target="_blank" rel="noreferrer" className="text-calm hover:underline">
              View on Etherscan ↗
            </a>
          </div>

          {/* Transactions table */}
          {result.transactions.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface py-12 text-center text-[12px] text-faint">
              No transactions found for this wallet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-ink/40">
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Risk</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Tx Hash</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">From</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">To</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Amount</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Status</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {result.transactions.map((tx, i) => (
                    <tr key={i} className={`hover:bg-ink/30 transition-colors ${tx.risk_score >= 80 ? "bg-red-500/5" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="tabnum font-bold text-[13px]" style={{ color: RISK_COLOR(tx.risk_score) }}>
                          {tx.risk_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        <a href={`https://etherscan.io/tx/${tx._hash}`} target="_blank" rel="noreferrer"
                          className="text-calm hover:underline">
                          {short(tx._hash)}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">{short(tx._from)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">{short(tx._to)}</td>
                      <td className="px-4 py-3 tabnum text-[12px] text-text">{fmtEth(tx._value_eth)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RISK_BG(tx.risk_score)}`}>
                          {RISK_LABEL(tx.risk_score)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-faint">{fmtTime(tx._timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Flagged explanations */}
          {result.transactions.filter(t => t.is_anomaly && t.explanation).map((tx, i) => (
            <div key={i} className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div className="text-[10px] uppercase tracking-widest text-red-400 mb-1">
                Flagged — {short(tx._hash)} · Risk {tx.risk_score}/100
              </div>
              <p className="text-[12px] text-text leading-relaxed whitespace-pre-line">{tx.explanation}</p>
            </div>
          ))}
        </>
      )}
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
