import { useThreats } from "../hooks/useThreats.js";
import {
  TACTICS,
  TECHNIQUES,
  TACTIC_COLORS,
  resolveMitre,
  TYPE_TO_TECHNIQUES,
} from "../lib/mitre.js";
import { useState, useMemo } from "react";

/* ─── helpers ─────────────────────────────────────────────────── */

const SCORE_COLOR = (score) => {
  if (score >= 80) return "text-red-400";
  if (score >= 50) return "text-orange-400";
  return "text-emerald-400";
};

const SCORE_BG = (score) => {
  if (score >= 80) return "bg-red-500/15 border-red-500/30";
  if (score >= 50) return "bg-orange-500/15 border-orange-500/30";
  return "bg-emerald-500/15 border-emerald-500/30";
};

/* ─── Technique pill used in the matrix ──────────────────────── */
function TechniquePill({ tech, hitCount, maxHit, onClick, active }) {
  const intensity = maxHit > 0 ? hitCount / maxHit : 0;
  const color = TACTIC_COLORS[tech.tactic] ?? "var(--color-calm)";

  return (
    <button
      onClick={onClick}
      title={`${tech.id} · ${tech.name}\nHits: ${hitCount}`}
      className={`group relative rounded px-2 py-1.5 text-left text-[10px] font-mono leading-tight transition-all cursor-pointer border ${
        active
          ? "border-current ring-1 ring-current"
          : hitCount > 0
          ? "border-white/10 hover:border-current"
          : "border-transparent opacity-30 hover:opacity-60"
      }`}
      style={{
        color,
        background:
          hitCount > 0
            ? `color-mix(in oklch, ${color} ${Math.max(8, Math.round(intensity * 28))}%, transparent)`
            : "transparent",
        boxShadow:
          hitCount > 0 && active ? `0 0 14px 0 color-mix(in oklch, ${color} 40%, transparent)` : undefined,
      }}
    >
      <div className="font-bold">{tech.id}</div>
      <div className="mt-0.5 text-[9px] opacity-70 truncate max-w-[80px]">{tech.name}</div>
      {hitCount > 0 && (
        <span
          className="absolute top-1 right-1 rounded-full px-1 text-[8px] font-bold leading-none"
          style={{ background: color, color: "#0d0f14" }}
        >
          {hitCount}
        </span>
      )}
    </button>
  );
}

/* ─── Tactic column header ────────────────────────────────────── */
function TacticHeader({ tactic, hitTechs }) {
  const color = TACTIC_COLORS[tactic] ?? "var(--color-calm)";
  return (
    <div className="flex flex-col gap-1">
      <div
        className="rounded-t px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-center leading-tight"
        style={{ background: `color-mix(in oklch, ${color} 14%, transparent)`, color }}
      >
        {tactic}
      </div>
      {hitTechs > 0 && (
        <div
          className="text-center text-[8px] font-mono font-bold"
          style={{ color }}
        >
          {hitTechs} hit
        </div>
      )}
    </div>
  );
}

/* ─── Threat row in the bottom table ─────────────────────────── */
function ThreatRow({ threat, onSelect, active }) {
  const { techniques } = resolveMitre(threat.type);
  const fmt = (ts) => {
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  };

  return (
    <tr
      onClick={() => onSelect(threat)}
      className={`cursor-pointer transition-colors ${
        active ? "bg-calm/5 border-l-2 border-calm" : "hover:bg-ink/40"
      }`}
    >
      <td className="px-4 py-2.5 font-mono text-[11px] text-calm">{threat.id?.slice(0, 8)}…</td>
      <td className="px-4 py-2.5 text-[12px] font-medium text-text">{threat.type || "—"}</td>
      <td className="px-4 py-2.5">
        <span
          className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-mono font-bold border ${SCORE_BG(threat.score)} ${SCORE_COLOR(threat.score)}`}
        >
          {threat.score}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap gap-1">
          {techniques.length === 0 ? (
            <span className="text-[10px] text-faint italic">—</span>
          ) : (
            techniques.map((t) => (
              <span
                key={t.id}
                className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold border"
                style={{
                  color: TACTIC_COLORS[t.tactic] ?? "var(--color-calm)",
                  borderColor: `color-mix(in oklch, ${TACTIC_COLORS[t.tactic] ?? "var(--color-calm)"} 30%, transparent)`,
                  background: `color-mix(in oklch, ${TACTIC_COLORS[t.tactic] ?? "var(--color-calm)"} 10%, transparent)`,
                }}
              >
                {t.id}
              </span>
            ))
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 text-[11px] text-faint">{fmt(threat.timestamp)}</td>
    </tr>
  );
}

/* ─── Detail panel for a selected technique ──────────────────── */
function TechniqueDetail({ tech, threats, onClose }) {
  if (!tech) return null;
  const color = TACTIC_COLORS[tech.tactic] ?? "var(--color-calm)";
  const related = threats.filter((t) => {
    const { techniqueIds } = resolveMitre(t.type);
    return techniqueIds.includes(tech.id);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        {/* header */}
        <div
          className="px-6 py-5 border-b border-line"
          style={{ background: `color-mix(in oklch, ${color} 8%, transparent)` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color }}>
                MITRE ATT&amp;CK · {tech.tactic}
              </div>
              <div className="mt-1 text-xl font-bold text-text">{tech.id}</div>
              <div className="text-[15px] font-medium text-muted">{tech.name}</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-line bg-ink px-3 py-1.5 text-[11px] text-faint hover:text-text transition cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-[13px] leading-relaxed text-muted">{tech.description}</p>

          <a
            href={tech.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition"
            style={{ color }}
          >
            View on MITRE ATT&amp;CK ↗
          </a>

          <div className="border-t border-line/50 pt-4">
            <div className="mb-2 text-[9px] uppercase tracking-widest text-faint">
              Triggered by {related.length} incident{related.length !== 1 ? "s" : ""} in CipherWatch
            </div>
            {related.length === 0 ? (
              <p className="text-[12px] text-faint italic">No active threats mapped to this technique yet.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {related.slice(0, 8).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink/60 px-3 py-2"
                  >
                    <div>
                      <span className="font-mono text-[10px] text-calm">{t.id?.slice(0, 8)}…</span>
                      <span className="ml-2 text-[11px] text-text">{t.type}</span>
                    </div>
                    <span className={`font-mono text-[11px] font-bold ${SCORE_COLOR(t.score)}`}>
                      {t.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function MitreMatrix() {
  const { threats, loading } = useThreats(200);
  const [selectedTech, setSelectedTech] = useState(null);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [filterActive, setFilterActive] = useState(false);

  // Build a hit-count map: technique ID → number of threats that triggered it
  const hitCounts = useMemo(() => {
    const counts = {};
    threats.forEach((t) => {
      const { techniqueIds } = resolveMitre(t.type);
      techniqueIds.forEach((id) => {
        counts[id] = (counts[id] ?? 0) + 1;
      });
    });
    return counts;
  }, [threats]);

  const maxHit = useMemo(() => Math.max(1, ...Object.values(hitCounts)), [hitCounts]);

  // Techniques per tactic (only show the ones we care about)
  const techsByTactic = useMemo(() => {
    const map = {};
    TACTICS.forEach((tactic) => {
      map[tactic] = Object.values(TECHNIQUES).filter((t) => t.tactic === tactic);
    });
    return map;
  }, []);

  // Only show tactics that have at least one technique in our catalog
  const activeTactics = TACTICS.filter((tactic) => techsByTactic[tactic]?.length > 0);

  // Summary stats
  const hitTechIds = new Set(Object.keys(hitCounts));
  const hitTactics = new Set(
    Object.values(TECHNIQUES)
      .filter((t) => hitTechIds.has(t.id))
      .map((t) => t.tactic)
  );

  // Threat table: optionally filtered to only threats with a MITRE mapping
  const tableThreats = useMemo(() => {
    const list = filterActive
      ? threats.filter((t) => resolveMitre(t.type).techniqueIds.length > 0)
      : threats;
    return list.slice(0, 50);
  }, [threats, filterActive]);

  const handleTechClick = (tech) => {
    setSelectedTech((prev) => (prev?.id === tech.id ? null : tech));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 overflow-auto">
      {/* ── Page header ── */}
      <header>
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-faint">
            CipherWatch
          </div>
          <div className="text-faint">›</div>
          <h2 className="text-xl font-bold tracking-tight text-text">MITRE ATT&amp;CK Matrix</h2>
        </div>
        <p className="mt-1 text-[12px] text-faint max-w-2xl">
          Every CipherWatch anomaly is automatically mapped to the MITRE ATT&amp;CK framework.
          Cells glow when a live threat has triggered that technique. Click any cell to inspect linked incidents.
        </p>
      </header>

      {/* ── Summary stats row ── */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Techniques Hit", value: hitTechIds.size, color: "var(--color-threat)" },
          { label: "Tactics Covered", value: hitTactics.size, color: "var(--color-auth)" },
          { label: "Threats Mapped", value: threats.filter((t) => resolveMitre(t.type).techniqueIds.length > 0).length, color: "var(--color-calm)" },
          { label: "Total Incidents", value: threats.length, color: "var(--color-muted)" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-surface px-5 py-3">
            <div
              className="tabnum text-2xl font-bold leading-none"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-widest text-faint">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── ATT&CK Matrix ── */}
      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="border-b border-line px-5 py-3 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.3em] text-faint font-bold">
            ATT&amp;CK Enterprise Matrix — Live Overlay
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-threat animate-pulse" />
            <span className="text-[10px] text-faint">Active techniques glow red</span>
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${activeTactics.length}, minmax(96px, 1fr))` }}
          >
            {/* Tactic headers */}
            {activeTactics.map((tactic) => {
              const hitTechsInTactic = techsByTactic[tactic].filter((t) => hitCounts[t.id] > 0).length;
              return (
                <TacticHeader key={tactic} tactic={tactic} hitTechs={hitTechsInTactic} />
              );
            })}

            {/* Technique cells */}
            {activeTactics.map((tactic) => (
              <div key={tactic} className="flex flex-col gap-1">
                {techsByTactic[tactic].map((tech) => (
                  <TechniquePill
                    key={tech.id}
                    tech={tech}
                    hitCount={hitCounts[tech.id] ?? 0}
                    maxHit={maxHit}
                    active={selectedTech?.id === tech.id}
                    onClick={() => handleTechClick(tech)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Threat → Technique mapping table ── */}
      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="border-b border-line px-5 py-3 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.3em] text-faint font-bold">
            Incident → Technique Mapping
          </div>
          <button
            onClick={() => setFilterActive((p) => !p)}
            className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition cursor-pointer ${
              filterActive
                ? "border-calm/40 bg-calm/10 text-calm"
                : "border-line bg-ink text-faint hover:text-text"
            }`}
          >
            {filterActive ? "✓ Mapped Only" : "Show All"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-ink/40">
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Incident ID</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Threat Type</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Risk Score</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">MITRE Techniques</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[12px] text-faint">
                    Waiting for threat data from Firebase…
                  </td>
                </tr>
              ) : tableThreats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[12px] text-faint">
                    No incidents yet — inject an attack to see MITRE mappings appear.
                  </td>
                </tr>
              ) : (
                tableThreats.map((t) => (
                  <ThreatRow
                    key={t.id}
                    threat={t}
                    onSelect={setSelectedThreat}
                    active={selectedThreat?.id === t.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Technique detail modal ── */}
      {selectedTech && (
        <TechniqueDetail
          tech={selectedTech}
          threats={threats}
          onClose={() => setSelectedTech(null)}
        />
      )}
    </div>
  );
}
