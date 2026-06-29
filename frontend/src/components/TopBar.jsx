export default function TopBar({ connected, underThreat, counts, onPanic }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-surface/60 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative grid h-8 w-8 place-items-center rounded-md bg-ink ring-1 ring-line">
          <span
            className="h-3 w-3 rounded-sm"
            style={{
              background: underThreat ? "var(--color-threat)" : "var(--color-calm)",
              boxShadow: `0 0 12px ${underThreat ? "var(--color-threat)" : "var(--color-calm)"}`,
            }}
          />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-[0.2em] text-text">CIPHER<span className="text-calm">WATCH</span></div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-faint">Threat Detection Platform</div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {onPanic && (
          <button
            onClick={onPanic}
            className="px-2.5 py-1 rounded bg-threat/10 border border-threat/30 text-[10px] uppercase tracking-widest text-threat hover:bg-threat/25 hover:border-threat cursor-pointer transition mr-1 font-semibold"
            title="Manual System Panic Lockdown Trigger"
          >
            🚨 Panic
          </button>
        )}
        <Stat label="Events" value={counts.events} />
        <Stat label="Alerts" value={counts.alerts} tone="threat" />
        <StatusPill underThreat={underThreat} />
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: connected ? "var(--color-calm)" : "var(--color-faint)" }}
          />
          {connected ? "Live" : "Reconnecting"}
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="text-right">
      <div
        className="tabnum text-lg font-semibold leading-none"
        style={{ color: tone === "threat" ? "var(--color-threat)" : "var(--color-text)" }}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-faint">{label}</div>
    </div>
  );
}

function StatusPill({ underThreat }) {
  return (
    <div
      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ring-1 ${
        underThreat ? "threat-pulse" : ""
      }`}
      style={{
        color: underThreat ? "var(--color-threat)" : "var(--color-calm)",
        background: underThreat ? "oklch(40% 0.13 25 / 0.18)" : "oklch(40% 0.06 178 / 0.14)",
        borderColor: underThreat ? "var(--color-threat-dim)" : "transparent",
      }}
    >
      {underThreat ? "● Threat Detected" : "● Monitoring"}
    </div>
  );
}
