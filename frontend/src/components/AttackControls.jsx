import { useState } from "react";
import { injectUPIAttack, injectBlockchainAttack } from "../lib/api";

const ATTACK_LABELS = {
  volume_spike: "Volume Spike",
  credential_stuffing: "Credential Stuffing",
  mass_delete: "Mass Delete",
};

// UPI and blockchain attacks fire on dedicated endpoints (no entity target needed)
const SPECIAL_ATTACKS = [
  {
    id: "upi_fraud",
    label: "UPI Fraud",
    sub: "High-value transfer to unknown VPA",
    color: "#f59e0b",
    fn: injectUPIAttack,
  },
  {
    id: "blockchain_anomaly",
    label: "Blockchain Anomaly",
    sub: "Large ETH → contract address",
    color: "#a78bfa",
    fn: injectBlockchainAttack,
  },
];

export default function AttackControls({ entities, attacks, onInject, defaultEntity }) {
  const [target, setTarget] = useState(defaultEntity ?? entities[0] ?? "");
  const [busy, setBusy] = useState(null);

  const fire = async (kind) => {
    const entity = target || entities[0];
    if (!entity) return;
    setBusy(kind);
    try {
      await onInject(kind, entity, 18);
    } catch {
      /* resilient on stage */
    } finally {
      setTimeout(() => setBusy(null), 600);
    }
  };

  const fireSpecial = async (attack) => {
    setBusy(attack.id);
    try {
      await attack.fn();
    } catch {
      /* resilient on stage */
    } finally {
      setTimeout(() => setBusy(null), 800);
    }
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
      {/* Existing source attacks */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.25em] text-faint">Attack injection</div>
          <label className="flex items-center gap-2 text-[11px] text-muted">
            target
            <select
              data-testid="target-select"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="tabnum rounded border border-line bg-ink px-2 py-1 text-text outline-none focus:border-calm"
            >
              {entities.map((en) => (
                <option key={en} value={en}>{en}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {attacks.map((kind) => (
            <button
              key={kind}
              data-testid={`attack-${kind}`}
              onClick={() => fire(kind)}
              disabled={busy === kind}
              className="group relative overflow-hidden rounded-lg border border-line bg-ink px-3 py-3 text-left transition hover:border-threat-dim disabled:opacity-60"
            >
              <div className="text-[13px] font-semibold text-text transition group-hover:text-threat">
                {ATTACK_LABELS[kind] ?? kind}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-widest text-faint">
                {busy === kind ? "injecting…" : "inject →"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* New: UPI + Blockchain attack buttons */}
      <div>
        <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-faint">
          New integrations
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SPECIAL_ATTACKS.map((attack) => (
            <button
              key={attack.id}
              data-testid={`attack-${attack.id}`}
              onClick={() => fireSpecial(attack)}
              disabled={busy === attack.id}
              className="group relative overflow-hidden rounded-lg border bg-ink px-3 py-3 text-left transition disabled:opacity-60"
              style={{ borderColor: busy === attack.id ? attack.color : "var(--color-line)" }}
            >
              <div
                className="text-[13px] font-semibold transition"
                style={{ color: busy === attack.id ? attack.color : "var(--color-text)" }}
              >
                {attack.label}
              </div>
              <div className="mt-0.5 text-[10px] text-faint">
                {busy === attack.id ? "injecting…" : attack.sub}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
