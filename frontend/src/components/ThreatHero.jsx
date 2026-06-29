import { SOURCE_META } from "../lib/api.js";

// The differentiator: the plain-English reason, front and center. When a threat
// is active this is the loudest thing on screen; when calm it rests.
export default function ThreatHero({ threat }) {
  if (!threat) return <CalmHero />;

  const meta = SOURCE_META[threat.source] ?? { label: threat.source, color: "var(--color-calm)" };
  const lines = (threat.explanation ?? "").split("\n").filter(Boolean);

  return (
    <section className="scan-sweep relative overflow-hidden rounded-xl border border-threat-dim bg-surface p-6 threat-pulse">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-threat">
            ▲ Threat Detected
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="tabnum text-2xl font-semibold text-text">{threat.entity_id}</span>
            <span
              className="rounded px-2 py-0.5 text-[10px] font-bold tracking-widest"
              style={{ color: meta.color, background: "color-mix(in oklch, var(--color-ink), white 4%)" }}
            >
              {meta.label}
            </span>
            {threat.explanation_source && (
              <span className="text-[10px] uppercase tracking-widest text-faint">
                via {threat.explanation_source}
              </span>
            )}
          </div>
        </div>
        <RiskGauge value={threat.risk_score} />
      </div>

      <div className="mt-5 rounded-lg border border-line bg-ink/60 p-4">
        <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-faint">
          Why this fired
        </div>
        <ul className="space-y-1.5">
          {lines.map((l, i) => (
            <li key={i} className="text-[15px] leading-snug text-text">
              {l.replace(/^[•\-]\s*/, "")}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CalmHero() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-calm">
            ● All Systems Nominal
          </div>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Watching every entity's normal behaviour across transactions, database, and
            auth. Inject an attack below to see the engine flag it in real time, with a
            plain-English reason.
          </p>
        </div>
        <RiskGauge value={0} calm />
      </div>
    </section>
  );
}

function RiskGauge({ value, calm }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const color = calm ? "var(--color-calm)" : "var(--color-threat)";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--color-line)" strokeWidth="7" />
        <circle
          cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 400ms cubic-bezier(0.16,1,0.3,1)", filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="tabnum text-2xl font-bold leading-none" style={{ color }}>{value}</div>
        <div className="text-[9px] uppercase tracking-widest text-faint">risk</div>
      </div>
    </div>
  );
}
