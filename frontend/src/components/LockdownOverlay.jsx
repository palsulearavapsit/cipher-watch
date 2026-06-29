import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LockdownOverlay() {
  const { unlockSystem } = useAuth();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState(false);
  const [logs, setLogs] = useState([]);

  const logLines = [
    "▲ SEVERE ANOMALY VERDICT: RISK_SCORE >= 90",
    "▲ DETECTED EXFILTRATION / MALICIOUS INTRUSION PROTOCOL",
    "⎋ INITIATING INSTANT OPS SYSTEM LOCKDOWN...",
    "🔒 OUTBOUND WEBSOCKET CONNECTIVITY BLOCK ACTIVE",
    "🔒 LOCAL FILE SYSTEMS AND ENDPOINTS DETACHED",
    "🔒 DATASTORE SEGREGATION COMPLETED",
    "🔒 ENCRYPTING DATABASE CACHES AND DATA IN TRANSIT...",
    "🔑 SECURITY ACCESS LEVEL ESCALATED TO Tier-0 (ADMIN)",
    "📡 AWAITING EMERGENCY SECURITY OVERRIDE PASSKEY...",
  ];

  useEffect(() => {
    // Add logs one by one for typing terminal effect
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < logLines.length) {
        setLogs((prev) => [...prev, logLines[idx]]);
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, []);

  const handleUnlock = (e) => {
    e.preventDefault();
    const success = unlockSystem(passphrase);
    if (!success) {
      setError(true);
      setPassphrase("");
      // Reset error after 3 seconds
      setTimeout(() => setError(false), 3000);
    }
  };

  const handleBypass = () => {
    unlockSystem("cipherlock2026");
  };

  return (
    <div className="fixed inset-0 h-screen w-screen bg-black/95 flex flex-col items-center justify-center p-4 z-[9999] overflow-hidden select-none">
      {/* Pulsating Red Threat Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-threat/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      
      {/* Lockdown Container */}
      <div className="w-full max-w-xl rounded-xl border border-threat-dim bg-surface/60 backdrop-blur-md p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col gap-6 relative">
        
        {/* Close Button */}
        <button
          onClick={() => unlockSystem("cipherlock2026")}
          className="absolute top-4 right-4 text-faint hover:text-threat hover:scale-110 transition cursor-pointer text-lg p-1.5 z-10 flex items-center justify-center"
          title="Dismiss System Lockdown"
        >
          ✕
        </button>

        {/* Faint scanner line */}
        <div className="absolute inset-x-0 h-0.5 bg-threat/20 top-0 animate-[sweep_3s_linear_infinite] pointer-events-none" />

        {/* Pulsing Warning Banner */}
        <div className="flex items-center gap-3 justify-center text-center border-b border-threat-dim/40 pb-4">
          <div className="h-2 w-2 rounded-full bg-threat animate-ping" />
          <div className="text-[13px] font-bold uppercase tracking-[0.3em] text-threat animate-pulse">
            SYSTEM LOCKDOWN PROTOCOL ACTIVE
          </div>
        </div>

        {/* Security Logs Terminal */}
        <div className="bg-black/80 rounded-lg p-4 font-mono text-[11px] text-threat-dim border border-threat-dim/20 h-44 overflow-y-auto space-y-1.5 scrollbar-thin">
          {logs.map((log, i) => (
            <div key={i} className="row-in leading-relaxed">
              <span className="text-threat mr-2">›</span>
              {log}
            </div>
          ))}
          {logs.length === logLines.length && (
            <div className="animate-pulse flex items-center gap-1.5 mt-2">
              <span className="h-1.5 w-1.5 bg-threat rounded-full" />
              <span>TERMINAL STATUS: AWAITING DECRYPTION KEY...</span>
            </div>
          )}
        </div>

        {/* Passphrase Entry */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-faint mb-1.5 font-bold">
              Secure Override Key
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setError(false);
              }}
              placeholder="ENTER ADMINISTRATIVE PASSPHRASE"
              className={`w-full rounded-lg border bg-black px-4 py-3 text-[13px] text-center font-mono outline-none transition-all ${
                error
                  ? "border-threat text-threat focus:ring-1 focus:ring-threat/30"
                  : "border-threat-dim/40 text-text focus:border-threat focus:ring-1 focus:ring-threat/20"
              }`}
            />
          </div>

          {error && (
            <div className="text-center text-[11px] text-threat font-bold uppercase tracking-widest animate-shake">
              ⚠️ ACCESS DENIED: INVALID OVERRIDE PASSPHRASE
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-threat/10 border border-threat/30 py-3 text-[12px] font-bold uppercase tracking-widest text-threat hover:bg-threat/20 hover:border-threat cursor-pointer transition"
            >
              Authorize Decryption
            </button>
            <button
              type="button"
              onClick={handleBypass}
              className="px-4 py-3 rounded-lg border border-line bg-ink text-[12px] font-bold uppercase tracking-widest text-faint hover:text-text hover:bg-surface-2 transition cursor-pointer"
              title="Autofill override code and decrypt console instantly"
            >
              Developer Bypass
            </button>
          </div>
        </form>

      </div>

      <footer className="mt-8 text-[9px] uppercase tracking-[0.25em] text-threat-dim opacity-70">
        SECURE THREAT INTERCEPTOR ACTIVE // Tier 0 OVERRIDE REQUIRED
      </footer>
    </div>
  );
}
