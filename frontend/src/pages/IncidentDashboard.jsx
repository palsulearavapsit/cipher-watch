import { useState, useMemo } from "react";
import { useThreats } from "../hooks/useThreats.js";
import { useAuth } from "../context/AuthContext.jsx";
import { exportPDF } from "../lib/reportExporter.js";
import { resolveMitre } from "../lib/mitre.js";
import { db } from "../firebase.js";
import { doc, updateDoc } from "firebase/firestore";

/* ─── constants ───────────────────────────────────────────────── */

const LIFECYCLE = ["active", "investigating", "contained", "resolved"];

const LIFECYCLE_META = {
  active:        { label: "Active",        color: "var(--color-threat)",  bg: "bg-red-500/10 border-red-500/30",      dot: "bg-red-400" },
  investigating: { label: "Investigating", color: "#f59e0b",              bg: "bg-amber-500/10 border-amber-500/30",  dot: "bg-amber-400" },
  contained:     { label: "Contained",     color: "#a78bfa",              bg: "bg-violet-500/10 border-violet-500/30", dot: "bg-violet-400" },
  resolved:      { label: "Resolved",      color: "var(--color-calm)",    bg: "bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-400" },
};

// Preset analyst names (drawn from the auth user + common SecOps names)
const ANALYSTS = ["Unassigned", "You", "Alice Menon", "Rahul Singh", "Priya Nair", "Admin SOC"];

const SOURCE_ICON = {
  upi:         { icon: "₹", color: "#f59e0b" },
  blockchain:  { icon: "◈", color: "#a78bfa" },
  database:    { icon: "⊞", color: "var(--color-db)" },
  auth:        { icon: "⚿", color: "var(--color-auth)" },
  transaction: { icon: "⇄", color: "var(--color-txn)" },
};

/* ─── helpers ─────────────────────────────────────────────────── */

const getSource = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("upi"))                                         return "upi";
  if (t.includes("blockchain") || t.includes("eth"))            return "blockchain";
  if (t.includes("database") || t.includes("delete"))           return "database";
  if (t.includes("credential") || t.includes("auth"))           return "auth";
  return "transaction";
};

const fmt = (ts) => { try { return new Date(ts).toLocaleString(); } catch { return ts ?? "—"; } };
const fmtShort = (ts) => { try { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

const riskLabel = (s) => s >= 80 ? "CRITICAL" : s >= 50 ? "HIGH" : "LOW";
const riskColor = (s) => s >= 80 ? "var(--color-threat)" : s >= 50 ? "#f59e0b" : "var(--color-calm)";
const riskBg    = (s) => s >= 80 ? "bg-red-500/15 border-red-500/30 text-red-400"
                       : s >= 50 ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                       :           "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";

/* ─── Firestore update helpers ────────────────────────────────── */

async function updateThreat(id, patch) {
  try {
    await updateDoc(doc(db, "threats", id), patch);
  } catch (e) {
    console.warn("Firestore update failed (demo mode?):", e.message);
  }
}

/* ─── Priority Queue row ──────────────────────────────────────── */

function PriorityRow({ threat, rank, onClick, selected }) {
  const src = getSource(threat.type);
  const si  = SOURCE_ICON[src] ?? SOURCE_ICON.transaction;
  const lm  = LIFECYCLE_META[threat.status] ?? LIFECYCLE_META.active;

  return (
    <tr
      onClick={() => onClick(threat)}
      className={`cursor-pointer border-b border-line/40 transition-colors ${
        selected ? "bg-calm/5" : "hover:bg-ink/50"
      }`}
    >
      {/* rank */}
      <td className="px-3 py-2.5 text-center">
        <span
          className="tabnum inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
          style={{ background: riskColor(threat.score), color: "#0d0f14" }}
        >
          {rank}
        </span>
      </td>
      {/* source icon */}
      <td className="px-3 py-2.5 text-center text-[14px]" style={{ color: si.color }}>
        {si.icon}
      </td>
      {/* type */}
      <td className="px-3 py-2.5 max-w-[140px]">
        <div className="truncate text-[12px] font-medium text-text" title={threat.type}>{threat.type || "—"}</div>
        <div className="truncate text-[9px] text-faint font-mono">{threat.entity_id}</div>
      </td>
      {/* score */}
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-mono font-bold ${riskBg(threat.score)}`}>
          {threat.score}
        </span>
      </td>
      {/* status */}
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-medium ${lm.bg}`}>
          <span className={`h-1 w-1 rounded-full ${lm.dot}`} />
          {lm.label}
        </span>
      </td>
      {/* time */}
      <td className="px-3 py-2.5 text-[10px] text-faint tabnum">{fmtShort(threat.timestamp)}</td>
    </tr>
  );
}

/* ─── Kanban column ───────────────────────────────────────────── */

function KanbanColumn({ status, threats, onCardClick, selectedId }) {
  const lm = LIFECYCLE_META[status];
  return (
    <div className="flex flex-col gap-2 min-w-[200px] flex-1">
      {/* header */}
      <div
        className={`flex items-center justify-between rounded-t-lg border px-3 py-2 ${lm.bg}`}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${lm.dot}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: lm.color }}>
            {lm.label}
          </span>
        </div>
        <span className="tabnum text-[11px] font-bold" style={{ color: lm.color }}>{threats.length}</span>
      </div>

      {/* cards */}
      <div className="flex flex-col gap-2 min-h-[80px]">
        {threats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line/40 px-3 py-4 text-center text-[10px] text-faint">
            No incidents
          </div>
        ) : (
          threats.slice(0, 8).map((t) => {
            const si = SOURCE_ICON[getSource(t.type)] ?? SOURCE_ICON.transaction;
            return (
              <button
                key={t.id}
                onClick={() => onCardClick(t)}
                className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-left transition cursor-pointer ${
                  selectedId === t.id ? "border-calm/50 ring-1 ring-calm/20" : "border-line hover:border-line/80 hover:bg-ink/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold" style={{ color: si.color }}>{si.icon} {getSource(t.type).toUpperCase()}</span>
                  <span className={`tabnum rounded border px-1.5 text-[9px] font-mono font-bold ${riskBg(t.score)}`}>{t.score}</span>
                </div>
                <div className="truncate text-[11px] font-medium text-text">{t.type || "—"}</div>
                <div className="mt-1 text-[9px] text-faint font-mono truncate">{t.entity_id} · {fmtShort(t.timestamp)}</div>
                {t.assignee && t.assignee !== "Unassigned" && (
                  <div className="mt-1 text-[9px] text-calm">→ {t.assignee}</div>
                )}
              </button>
            );
          })
        )}
        {threats.length > 8 && (
          <div className="text-center text-[9px] text-faint py-1">+{threats.length - 8} more</div>
        )}
      </div>
    </div>
  );
}

/* ─── Incident detail panel ───────────────────────────────────── */

function IncidentPanel({ threat, onClose, currentUser }) {
  const [status, setStatus]   = useState(threat.status ?? "active");
  const [assignee, setAssignee] = useState(threat.assignee ?? "Unassigned");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [note, setNote]       = useState("");
  const [notes, setNotes]     = useState(threat.notes ?? []);

  const lm  = LIFECYCLE_META[status] ?? LIFECYCLE_META.active;
  const src = getSource(threat.type);
  const si  = SOURCE_ICON[src] ?? SOURCE_ICON.transaction;
  const { techniques } = resolveMitre(threat.type);

  const handleSave = async () => {
    setSaving(true);
    const patch = {
      status,
      assignee: assignee === "You" ? (currentUser?.displayName ?? "You") : assignee,
    };
    await updateThreat(threat.id, patch);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    const entry = {
      text: note.trim(),
      author: currentUser?.displayName ?? "Analyst",
      at: new Date().toISOString(),
    };
    const updated = [...notes, entry];
    setNotes(updated);
    setNote("");
    await updateThreat(threat.id, { notes: updated });
  };

  // Lifecycle progress bar steps
  const currentStep = LIFECYCLE.indexOf(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line bg-ink/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px]" style={{ color: si.color }}>{si.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-faint">Incident Detail</span>
            </div>
            <div className="text-lg font-bold text-text leading-tight">{threat.type || "Unknown Threat"}</div>
            <div className="mt-0.5 font-mono text-[10px] text-faint">{threat.id}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-mono font-bold ${riskBg(threat.score)}`}>
              {riskLabel(threat.score)} · {threat.score}
            </span>
            <button onClick={onClose} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[11px] text-faint hover:text-text transition cursor-pointer">✕</button>
          </div>
        </div>

        {/* ── Lifecycle progress bar ── */}
        <div className="px-6 py-4 border-b border-line/50 bg-ink/30">
          <div className="text-[9px] uppercase tracking-widest text-faint mb-3">Incident Lifecycle</div>
          <div className="flex items-center gap-0">
            {LIFECYCLE.map((step, i) => {
              const sm = LIFECYCLE_META[step];
              const isDone = i <= currentStep;
              const isActive = i === currentStep;
              return (
                <div key={step} className="flex items-center flex-1">
                  <button
                    onClick={() => setStatus(step)}
                    className={`flex flex-col items-center gap-1 flex-1 cursor-pointer transition-opacity ${isDone ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
                  >
                    <div
                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                        isActive ? "scale-110 shadow-lg" : ""
                      }`}
                      style={{
                        borderColor: isDone ? sm.color : "var(--color-line)",
                        background: isDone ? `color-mix(in oklch, ${sm.color} 20%, transparent)` : "transparent",
                        color: isDone ? sm.color : "var(--color-faint)",
                        boxShadow: isActive ? `0 0 14px 0 color-mix(in oklch, ${sm.color} 40%, transparent)` : undefined,
                      }}
                    >
                      {isDone ? (isActive ? "●" : "✓") : i + 1}
                    </div>
                    <span className="text-[8px] uppercase tracking-wider" style={{ color: isDone ? sm.color : "var(--color-faint)" }}>
                      {sm.label}
                    </span>
                  </button>
                  {i < LIFECYCLE.length - 1 && (
                    <div
                      className="h-0.5 flex-1 mx-1 rounded transition-all"
                      style={{ background: i < currentStep ? lm.color : "var(--color-line)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            {[
              ["Entity",    threat.entity_id ?? "—"],
              ["Source",    src.toUpperCase()],
              ["Detected",  fmt(threat.timestamp)],
              ["Assignee",  threat.assignee ?? "Unassigned"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-ink/40 px-3 py-2">
                <div className="text-[9px] uppercase tracking-widest text-faint mb-0.5">{k}</div>
                <div className="font-medium text-text truncate">{v}</div>
              </div>
            ))}
          </div>

          {/* MITRE techniques */}
          {techniques.length > 0 && (
            <div>
              <div className="mb-2 text-[9px] uppercase tracking-widest text-faint">MITRE ATT&amp;CK</div>
              <div className="flex flex-wrap gap-2">
                {techniques.map((t) => (
                  <a
                    key={t.id}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-col rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-violet-400 hover:bg-violet-500/20 transition"
                  >
                    <span className="text-[10px] font-bold font-mono">{t.id}</span>
                    <span className="text-[9px] opacity-80">{t.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI explanation */}
          {threat.explanation && (
            <div>
              <div className="mb-2 text-[9px] uppercase tracking-widest text-faint">AI Forensic Analysis</div>
              <div className="rounded-lg border border-line bg-ink/40 px-4 py-3 text-[12px] leading-relaxed text-muted whitespace-pre-wrap">
                {threat.explanation}
              </div>
            </div>
          )}

          {/* Status + Assignee controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-[9px] uppercase tracking-widest text-faint">Update Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-[12px] text-text outline-none focus:border-calm transition"
              >
                {LIFECYCLE.map((s) => (
                  <option key={s} value={s}>{LIFECYCLE_META[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[9px] uppercase tracking-widest text-faint">Assign To</div>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-[12px] text-text outline-none focus:border-calm transition"
              >
                {ANALYSTS.map((a) => (
                  <option key={a} value={a}>{a === "You" ? `You (${currentUser?.displayName ?? "Analyst"})` : a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Analyst notes */}
          <div>
            <div className="mb-2 text-[9px] uppercase tracking-widest text-faint">Analyst Notes ({notes.length})</div>
            {notes.length > 0 && (
              <div className="mb-2 space-y-1.5 max-h-28 overflow-y-auto">
                {notes.map((n, i) => (
                  <div key={i} className="rounded-lg border border-line/50 bg-ink/40 px-3 py-2">
                    <div className="flex justify-between text-[9px] text-faint mb-0.5">
                      <span className="text-calm font-medium">{n.author}</span>
                      <span>{fmtShort(n.at)}</span>
                    </div>
                    <div className="text-[11px] text-text">{n.text}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                placeholder="Add a note... (Enter to submit)"
                className="flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-[12px] text-text placeholder:text-faint outline-none focus:border-calm transition"
              />
              <button
                onClick={handleAddNote}
                disabled={!note.trim()}
                className="rounded-lg border border-line bg-ink px-4 py-2 text-[11px] font-bold text-calm hover:bg-calm/10 hover:border-calm transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-line bg-ink/60">
          <button
            onClick={() => exportPDF(threat)}
            className="rounded-lg border border-line bg-ink px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-calm hover:bg-calm/10 hover:border-calm transition cursor-pointer"
          >
            📄 Export Report
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-line bg-ink px-4 py-2 text-[11px] text-faint hover:text-text transition cursor-pointer">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg border border-calm/40 bg-calm/10 px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-calm hover:bg-calm/20 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */

export default function IncidentDashboard() {
  const { threats, loading } = useThreats(200);
  const { user } = useAuth();

  const [view, setView]           = useState("kanban");   // "kanban" | "queue"
  const [selected, setSelected]   = useState(null);
  const [filterSrc, setFilterSrc] = useState("all");
  const [filterSev, setFilterSev] = useState("all");     // "all" | "critical" | "high" | "low"
  const [sortField, setSortField] = useState("score");

  /* derived */
  const filtered = useMemo(() => {
    return threats.filter((t) => {
      const src = getSource(t.type);
      if (filterSrc !== "all" && src !== filterSrc) return false;
      if (filterSev === "critical" && t.score < 80) return false;
      if (filterSev === "high"     && (t.score < 50 || t.score >= 80)) return false;
      if (filterSev === "low"      && t.score >= 50) return false;
      return true;
    });
  }, [threats, filterSrc, filterSev]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) =>
      sortField === "score"  ? b.score - a.score :
      sortField === "time"   ? (b.timestamp > a.timestamp ? 1 : -1) :
      /* status */ LIFECYCLE.indexOf(a.status ?? "active") - LIFECYCLE.indexOf(b.status ?? "active")
    );
  }, [filtered, sortField]);

  const byStatus = useMemo(() => {
    const m = {};
    LIFECYCLE.forEach((s) => { m[s] = sorted.filter((t) => (t.status ?? "active") === s); });
    return m;
  }, [sorted]);

  // Summary counts
  const counts = useMemo(() => ({
    total:         threats.length,
    active:        threats.filter((t) => (t.status ?? "active") === "active").length,
    investigating: threats.filter((t) => t.status === "investigating").length,
    contained:     threats.filter((t) => t.status === "contained").length,
    resolved:      threats.filter((t) => t.status === "resolved").length,
    critical:      threats.filter((t) => t.score >= 80).length,
  }), [threats]);

  const handleSelect = (t) => setSelected((prev) => prev?.id === t.id ? null : t);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 p-6 overflow-auto">

      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-faint">CipherWatch</span>
            <span className="text-faint">›</span>
            <h2 className="text-xl font-bold tracking-tight text-text">Incident Management</h2>
          </div>
          <p className="text-[12px] text-faint">
            Track, assign, and manage every security incident through its full lifecycle.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-line bg-ink overflow-hidden">
          {[["kanban", "⊟ Kanban"], ["queue", "☰ Priority Queue"]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-[11px] font-bold transition cursor-pointer ${
                view === v ? "bg-calm/15 text-calm" : "text-faint hover:text-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Summary stats ── */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total",         value: counts.total,         color: "var(--color-muted)" },
          { label: "Active",        value: counts.active,        color: "var(--color-threat)" },
          { label: "Investigating", value: counts.investigating, color: "#f59e0b" },
          { label: "Contained",     value: counts.contained,     color: "#a78bfa" },
          { label: "Resolved",      value: counts.resolved,      color: "var(--color-calm)" },
          { label: "Critical",      value: counts.critical,      color: "var(--color-threat)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-3">
            <div className="tabnum text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] uppercase tracking-widest text-faint mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line/40 pb-4">
        {/* Source filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-widest text-faint mr-1">Source:</span>
          {["all", "upi", "auth", "database", "blockchain", "transaction"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSrc(s)}
              className={`rounded-md border px-2.5 py-1 text-[10px] font-medium transition cursor-pointer ${
                filterSrc === s ? "border-calm/50 bg-calm/10 text-calm" : "border-line bg-ink text-faint hover:text-text"
              }`}
            >
              {s === "all" ? "All" : s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[9px] uppercase tracking-widest text-faint mr-1">Severity:</span>
          {[["all","All"], ["critical","Critical"], ["high","High"], ["low","Low"]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilterSev(v)}
              className={`rounded-md border px-2.5 py-1 text-[10px] font-medium transition cursor-pointer ${
                filterSev === v
                  ? v === "critical" ? "border-red-500/50 bg-red-500/10 text-red-400"
                  : v === "high"     ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                  : v === "low"      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  :                   "border-calm/50 bg-calm/10 text-calm"
                  : "border-line bg-ink text-faint hover:text-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading && threats.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-faint">
          Waiting for threat data from Firebase…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-faint">
          No incidents match the current filters.
        </div>
      ) : view === "kanban" ? (

        /* ── Kanban board ── */
        <div className="flex gap-3 overflow-x-auto pb-2">
          {LIFECYCLE.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              threats={byStatus[status]}
              onCardClick={handleSelect}
              selectedId={selected?.id}
            />
          ))}
        </div>

      ) : (

        /* ── Priority Queue table ── */
        <div className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-ink/40">
            <div className="text-[10px] uppercase tracking-[0.3em] text-faint font-bold">
              Priority Queue — {sorted.length} incidents
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-faint uppercase tracking-widest">Sort:</span>
              {[["score","Risk Score"], ["time","Time"], ["status","Status"]].map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setSortField(f)}
                  className={`rounded border px-2.5 py-1 text-[10px] font-medium transition cursor-pointer ${
                    sortField === f ? "border-calm/40 bg-calm/10 text-calm" : "border-line bg-surface text-faint hover:text-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-faint text-center">#</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-faint text-center">Src</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-faint">Type / Entity</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-faint">Score</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-faint">Status</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-faint">Time</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => (
                  <PriorityRow
                    key={t.id}
                    threat={t}
                    rank={i + 1}
                    onClick={handleSelect}
                    selected={selected?.id === t.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Incident detail modal ── */}
      {selected && (
        <IncidentPanel
          threat={selected}
          onClose={() => setSelected(null)}
          currentUser={user}
        />
      )}
    </div>
  );
}
