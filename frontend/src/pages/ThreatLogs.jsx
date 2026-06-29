import { useThreats } from "../hooks/useThreats.js";
import { useState } from "react";
import { exportPDF } from "../lib/reportExporter.js";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const SCORE_CLASS = (score) => {
  if (score >= 80) return { bg: "bg-red-500/20 text-red-400 border border-red-500/30" };
  if (score >= 50) return { bg: "bg-orange-500/20 text-orange-400 border border-orange-500/30" };
  return { bg: "bg-green-500/20 text-green-400 border border-green-500/30" };
};

const STATUS_CLASS = (status) => {
  if (status === "active") return "bg-rose-500/10 text-rose-400";
  if (status === "investigating") return "bg-amber-500/10 text-amber-400";
  return "bg-emerald-500/10 text-emerald-400";
};

const SOURCES = [
  { id: "upi", label: "UPI", color: "#f59e0b" },
  { id: "blockchain", label: "Chain", color: "#a78bfa" },
  { id: "database", label: "DB", color: "var(--color-db)" },
  { id: "auth", label: "Auth", color: "var(--color-auth)" },
  { id: "transaction", label: "TXN", color: "var(--color-txn)" }
];

const getThreatSource = (type) => {
  const t = (type || "").toLowerCase();
  if (t.includes("upi")) return "upi";
  if (t.includes("blockchain") || t.includes("eth")) return "blockchain";
  if (t.includes("database") || t.includes("delete") || t.includes("table")) return "database";
  if (t.includes("credential") || t.includes("stuffing") || t.includes("auth")) return "auth";
  return "transaction";
};

export default function ThreatLogs() {
  const { threats, loading } = useThreats();
  const [sort, setSort] = useState("desc");
  const [filters, setFilters] = useState({
    upi: true,
    blockchain: true,
    database: true,
    auth: true,
    transaction: true
  });

  const toggleFilter = (src) => {
    setFilters((prev) => ({ ...prev, [src]: !prev[src] }));
  };

  const filtered = threats.filter((t) => {
    const source = getThreatSource(t.type);
    return filters[source];
  });

  const sorted = [...filtered].sort((a, b) =>
    sort === "desc" ? b.score - a.score : a.score - b.score
  );

  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  // Timeline chart data: latest 15 items in chronological order
  const chartData = filtered
    .slice(0, 15)
    .reverse()
    .map((t, idx) => ({
      index: idx + 1,
      score: t.score,
      time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: t.type
    }));

  const data = chartData.length ? chartData : [{ index: 1, score: 0, time: "" }];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight text-text">Threat Logs</h2>
        <p className="mt-1 text-[12px] text-faint">
          Real-time anomalies written by the CipherWatch engine via Firebase.
        </p>
      </header>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {["active","investigating","resolved"].map((s) => {
          const count = threats.filter((t) => t.status === s).length;
          return (
            <div key={s} className="rounded-lg border border-line bg-surface px-4 py-2">
              <div className="tabnum text-lg font-semibold text-text">{count}</div>
              <div className="text-[10px] uppercase tracking-widest text-faint">{s}</div>
            </div>
          );
        })}
        <div className="rounded-lg border border-line bg-surface px-4 py-2">
          <div className="tabnum text-lg font-semibold text-text">{threats.length}</div>
          <div className="text-[10px] uppercase tracking-widest text-faint">total</div>
        </div>
      </div>

      {/* Recharts Timeline Graph */}
      {filtered.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-faint">
            Incident Risk Timeline (Latest 15 Alerts)
          </div>
          <div style={{ height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="logRiskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-threat)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-threat)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: "var(--color-faint)", fontSize: 9 }}
                  axisLine={{ stroke: "var(--color-line)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tick={{ fill: "var(--color-faint)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip
                  contentStyle={{ background: "var(--color-ink)", border: "1px solid var(--color-line)", borderRadius: 6, fontSize: 11 }}
                  itemStyle={{ color: "var(--color-threat)" }}
                  labelStyle={{ color: "var(--color-text)", fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-threat)"
                  strokeWidth={2}
                  fill="url(#logRiskFill)"
                  isAnimationActive={true}
                  dot={{ stroke: "var(--color-threat)", strokeWidth: 1, r: 3, fill: "var(--color-ink)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Filters Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/50 pb-4 mt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[10px] uppercase tracking-[0.25em] text-faint mr-2">Filter:</div>
          {SOURCES.map((src) => (
            <button
              key={src.id}
              onClick={() => toggleFilter(src.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium transition cursor-pointer border ${
                filters[src.id]
                  ? "bg-ink border-line text-text"
                  : "bg-surface/10 border-transparent text-faint hover:text-text hover:bg-surface/30"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: src.color }} />
              {src.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] uppercase tracking-widest text-faint">
            Displaying <span className="tabnum text-text font-bold">{filtered.length}</span> of <span className="tabnum text-text">{threats.length}</span> entries
          </span>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-ink/40">
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-faint">ID</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-faint">Threat Type</th>
                <th
                  className="px-5 py-3 text-[10px] uppercase tracking-widest text-faint cursor-pointer hover:text-text"
                  onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
                >
                  Score {sort === "desc" ? "↓" : "↑"}
                </th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-faint">Explanation</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-faint">Timestamp</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-faint">Status</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-faint text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[12px] text-faint">
                    {threats.length === 0
                      ? "Waiting for threats — Firebase writes appear here in real time once the backend detects an anomaly."
                      : "Loading…"}
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[12px] text-faint">
                    No threats yet — engine is monitoring. Inject an attack to see results here.
                  </td>
                </tr>
              ) : (
                sorted.map((t) => {
                  const sc = SCORE_CLASS(t.score);
                  return (
                    <tr key={t.id} className="hover:bg-ink/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-calm">{t.id}</td>
                      <td className="px-5 py-3 text-[13px] font-medium text-text">{t.type}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-mono font-bold ${sc.bg}`}>
                          {t.score}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-xs text-[11px] text-muted truncate" title={t.explanation}>
                        {t.explanation || <span className="text-faint italic">—</span>}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-faint">{fmt(t.timestamp)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_CLASS(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => exportPDF(t)}
                          className="px-2.5 py-1.5 rounded border border-line bg-ink text-[10px] font-bold uppercase tracking-widest text-calm hover:text-text hover:bg-calm/10 hover:border-calm transition cursor-pointer"
                          title="Generate printable forensic report"
                        >
                          📄 Export
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
