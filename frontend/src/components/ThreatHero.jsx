import { useState } from "react";
import { SOURCE_META } from "../lib/api.js";
import { exportPDF } from "../lib/reportExporter.js";

const MITIGATIONS = {
  upi: [
    { key: "freeze", label: "Freeze UPI Gateway", steps: ["Deploying Gateway Halt...", "Suspending credentials...", "UPI flow isolated."] },
    { key: "block_ip", label: "Block Source IP", steps: ["Fetching source IP...", "Adding routing reject rule...", "IP blocked."] },
    { key: "quarantine_dev", label: "Quarantine Device", steps: ["Locating transaction source...", "Marking device as compromised...", "Device quarantined."] }
  ],
  blockchain: [
    { key: "blacklist", label: "Blacklist Wallet", steps: ["Fetching blacklist directory...", "Broadcasting contract reject...", "Wallet blacklisted."] },
    { key: "pause_contract", label: "Pause Contract", steps: ["Verifying owner signature...", "Executing contract pause()...", "Contract execution halted."] },
    { key: "notify_exch", label: "Notify Exchange", steps: ["Compiling incident metadata...", "Dispatching threat signals...", "Exchanges notified."] }
  ],
  database: [
    { key: "quarantine_db", label: "Quarantine User", steps: ["Identifying DB session...", "Killing MySQL query threads...", "User session quarantined."] },
    { key: "revoke_db", label: "Revoke Privileges", steps: ["Running REVOKE ALL PRIVILEGES...", "Flushing database privileges...", "Privileges revoked."] },
    { key: "restore_state", label: "Restore Replica", steps: ["Locating latest snapshot...", "Mounting replication logs...", "Database replica aligned."] }
  ],
  auth: [
    { key: "terminate", label: "Terminate Session", steps: ["Revoking OAuth tokens...", "Flushing Redis session cache...", "Session terminated."] },
    { key: "lock_user", label: "Lock Account", steps: ["Locating email identifier...", "Setting locked=true in AuthDB...", "Account locked."] },
    { key: "block_geo", label: "Block Source Geo", steps: ["Identifying VPN endpoint...", "Updating routing geo-block...", "Access geo-blocked."] }
  ],
  transaction: [
    { key: "rate_limit", label: "Rate-Limit Endpoint", steps: ["Reading path telemetry...", "Applying 50 request limits...", "Endpoint throttled."] },
    { key: "port_filter", label: "Enable Port Filter", steps: ["Opening firewall interface...", "Injecting drop-rate filters...", "Filter enabled."] },
    { key: "log_incident", label: "Log Incident Case", steps: ["Creating SecOps incident...", "Assigning incident ID...", "Log written to files."] }
  ]
};

export default function ThreatHero({ threat, onResolve }) {
  if (!threat) return <CalmHero />;

  const [activeAction, setActiveAction] = useState(null);
  const [mitigationLogs, setMitigationLogs] = useState([]);

  const isResolved = threat.status === "resolved";
  const meta = SOURCE_META[threat.source] ?? { label: threat.source, color: "var(--color-calm)" };
  const lines = (threat.explanation ?? "").split("\n").filter(Boolean);
  const sourceActions = MITIGATIONS[threat.source] ?? MITIGATIONS.transaction;

  const handleMitigate = (act) => {
    if (activeAction || isResolved) return;
    
    setActiveAction(act.key);
    setMitigationLogs([]);
    
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < act.steps.length) {
        setMitigationLogs((prev) => [...prev, `[MITIGATION] ${act.steps[stepIdx]}`]);
        stepIdx++;
      } else {
        clearInterval(interval);
        // Trigger parent resolution callback
        if (onResolve) {
          onResolve("resolved");
        }
        
        // Write status update to Firebase Firestore (if threat has an ID)
        if (threat.id) {
          import("../firebase.js").then(({ db }) => {
            import("firebase/firestore").then(({ doc, updateDoc }) => {
              updateDoc(doc(db, "threats", threat.id), { status: "resolved" })
                .then(() => console.log(`Threat ${threat.id} resolved in Firestore.`))
                .catch((e) => console.error("Firestore update failed:", e));
            });
          });
        }
        
        setActiveAction(null);
      }
    }, 450);
  };

  return (
    <section
      className={`relative overflow-hidden rounded-xl border p-6 transition-all duration-500 ${
        isResolved
          ? "border-emerald-500/30 bg-surface shadow-[0_0_20px_rgba(16,185,129,0.06)]"
          : "scan-sweep border-threat-dim bg-surface threat-pulse"
      }`}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div
            className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors duration-500 ${
              isResolved ? "text-calm" : "text-threat"
            }`}
          >
            {isResolved ? "✔ Incident Mitigated & Resolved" : "▲ Threat Detected"}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="tabnum text-2xl font-semibold text-text">{threat.entity_id}</span>
            <span
              className="rounded px-2 py-0.5 text-[10px] font-bold tracking-widest transition-colors duration-500"
              style={{
                color: isResolved ? "var(--color-calm)" : meta.color,
                background: "color-mix(in oklch, var(--color-ink), white 4%)"
              }}
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
        <RiskGauge value={isResolved ? 0 : threat.risk_score} calm={isResolved} />
      </div>

      {/* Description and Export Details */}
      <div className="mt-5 rounded-lg border border-line bg-ink/60 p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
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
        <button
          onClick={() => exportPDF(threat)}
          className="self-end md:self-start rounded-lg border border-line bg-ink px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-calm hover:text-text hover:bg-calm/10 hover:border-calm transition cursor-pointer whitespace-nowrap"
          title="Print official forensic report for this incident"
        >
          📄 Export Report
        </button>
      </div>

      {/* Remediation & Mitigation Controls Console */}
      <div className="mt-5 pt-5 border-t border-line/40">
        {isResolved ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-[12px] text-calm font-mono flex items-center gap-2">
            <span>✔</span>
            <span>SYSTEM STATE RESTORED: Remediation protocol successfully deployed. Blocking rules are active.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-[9px] uppercase tracking-widest text-faint font-bold">
              One-Click Security Remediation Actions:
            </div>
            
            {/* Mitigation Buttons */}
            <div className="flex flex-wrap gap-3">
              {sourceActions.map((act) => (
                <button
                  key={act.key}
                  onClick={() => handleMitigate(act)}
                  disabled={activeAction !== null}
                  className={`rounded-lg border px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition cursor-pointer ${
                    activeAction === act.key
                      ? "border-threat bg-threat/10 text-threat animate-pulse"
                      : "border-line bg-ink text-muted hover:text-text hover:bg-surface-2 hover:border-threat-dim/50"
                  } disabled:opacity-50 disabled:pointer-events-none`}
                >
                  {activeAction === act.key ? "⚡ Mitigating..." : act.label}
                </button>
              ))}
            </div>

            {/* Simulated Mitigation Logs Console */}
            {activeAction && (
              <div className="rounded-lg border border-threat-dim/20 bg-black/80 p-3 font-mono text-[10px] text-threat-dim space-y-1 animate-pulse">
                {mitigationLogs.map((log, i) => (
                  <div key={i} className="row-in">
                    <span className="text-threat mr-1.5">›</span>
                    {log}
                  </div>
                ))}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="h-1.5 w-1.5 bg-threat rounded-full animate-ping" />
                  <span>EXECUTING REMEDIATION GATEWAY PROTOCOL...</span>
                </div>
              </div>
            )}
          </div>
        )}
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
