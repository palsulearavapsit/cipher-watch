import { useThreats } from "../hooks/useThreats.js";
import { useState } from "react";

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

export default function ThreatLogs() {
  const { threats, loading } = useThreats();
  const [sort, setSort] = useState("desc");

  const sorted = [...threats].sort((a, b) =>
    sort === "desc" ? b.score - a.score : a.score - b.score
  );

  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

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
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[12px] text-faint">
                    {threats.length === 0
                      ? "Waiting for threats — Firebase writes appear here in real time once the backend detects an anomaly."
                      : "Loading…"}
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[12px] text-faint">
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
