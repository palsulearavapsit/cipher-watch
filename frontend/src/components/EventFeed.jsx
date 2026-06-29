import { SOURCE_META } from "../lib/api.js";

// The live stream. Source tags make the "same engine, different source" story
// visible: a TXN spike and an AUTH anomaly scroll past flagged by one engine.
export default function EventFeed({ events }) {
  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="text-[10px] uppercase tracking-[0.25em] text-faint">Live event stream</div>
        <div className="text-[10px] uppercase tracking-widest text-faint">{events.length} shown</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="grid h-full place-items-center p-8 text-center text-xs text-faint">
            Waiting for traffic…
          </div>
        ) : (
          <ul>
            {events.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function Row({ e }) {
  const meta = SOURCE_META[e.source] ?? { label: e.source, color: "var(--color-faint)" };
  const risk = e.risk_score ?? 0;
  return (
    <li
      className="row-in flex items-center gap-3 border-b border-line/60 px-4 py-2"
      style={e.isAlert ? { background: "oklch(40% 0.13 25 / 0.12)" } : undefined}
    >
      <span
        className="w-12 shrink-0 text-center text-[9px] font-bold tracking-wider"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
      <span className="tabnum min-w-0 flex-1 truncate text-[13px] text-text">{e.entity_id}</span>
      {e.isAlert && (
        <span className="text-[9px] font-bold uppercase tracking-widest text-threat">alert</span>
      )}
      <span
        className="tabnum w-9 text-right text-[13px] font-semibold"
        style={{ color: risk >= 60 ? "var(--color-threat)" : risk > 0 ? "var(--color-db)" : "var(--color-faint)" }}
      >
        {risk}
      </span>
    </li>
  );
}
