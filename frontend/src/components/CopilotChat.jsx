import { useState, useEffect, useRef } from "react";
import { useThreats } from "../hooks/useThreats.js";

const PROMPT_META = [
  { id: "latest", label: "› Latest Anomaly", desc: "Identify and investigate the newest incident logs." },
  { id: "critical", label: "› Worst Critical Threat", desc: "Extract the threat with the highest risk rating." },
  { id: "ignore", label: "› Ignore List (Low Risk)", desc: "Identify low risk false-positives under 40." },
  { id: "summary", label: "› Summarize Incidents", desc: "Compile a high-level SecOps summary of all anomalies." },
  { id: "report", label: "› Full Investigation Report", desc: "Generate a comprehensive Markdown security report." }
];

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export default function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "SYSTEM SEC_OPS CO-PILOT ONLINE // Threat logs context loaded.\nSelect a predefined security command below to run forensic diagnostics:",
      isSystemInit: true
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const { threats } = useThreats();
  const listRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleCommand = async (cmd) => {
    if (isTyping) return;

    const userLabel = PROMPT_META.find(p => p.id === cmd)?.label || cmd;
    setMessages((prev) => [...prev, { role: "user", text: userLabel }]);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_type: cmd,
          threats: threats.map(t => ({
            id: t.id,
            type: t.type,
            score: t.score,
            explanation: t.explanation,
            timestamp: t.timestamp,
            status: t.status
          }))
        })
      });

      const data = await response.json();
      if (data.response) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "⚠️ Diagnostic failed: Connection timed out. Please verify the backend is running." }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Connection error: Failed to reach security chatbot server. Ensure port 8000 is active." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-ink border border-calm/40 hover:border-calm hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center text-calm cursor-pointer transition z-[9990]"
        title="Open Gemini SecOps Chatbot"
      >
        <span className="text-xl animate-pulse font-mono font-bold">🤖</span>
      </button>

      {/* Slide-out Chat Panel Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-full sm:w-[400px] border-l border-line bg-surface/95 backdrop-blur-md p-5 flex flex-col gap-4 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-[9991] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-calm animate-pulse" />
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-text">
              Gemini SecOps Co-Pilot
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-faint hover:text-text cursor-pointer transition text-sm p-1"
            title="Minimize Chatbot"
          >
            ✕
          </button>
        </div>

        {/* Conversation Logs Feed */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin font-mono text-[11px] leading-relaxed"
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-3 border ${
                m.role === "assistant"
                  ? "bg-ink/50 border-line text-text"
                  : "bg-calm/10 border-calm/20 text-calm"
              }`}
            >
              <div className="text-[9px] uppercase tracking-widest text-faint mb-1.5 font-bold">
                {m.role === "assistant" ? "[ SYSTEM ASSISTANT ]" : "[ SECURITY ANALYST ]"}
              </div>
              {m.role === "assistant" && !m.isSystemInit ? (
                <TypewriterText text={m.text} />
              ) : (
                <div className="whitespace-pre-wrap">{m.text}</div>
              )}
            </div>
          ))}

          {/* Typing Telemetry Loader */}
          {isTyping && (
            <div className="rounded-lg p-3 border bg-ink/30 border-threat-dim/20 text-threat-dim animate-pulse">
              <div className="text-[9px] uppercase tracking-widest text-threat mb-1.5 font-bold">
                [ DIAGNOSTICS ACTIVE ]
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-3 bg-threat-dim animate-[sweep_1.5s_linear_infinite]" />
                <span>ANALYZING THREAT TELEMETRY RECORDS...</span>
              </div>
            </div>
          )}
        </div>

        {/* Command Panel Prompt Buttons */}
        <div className="border-t border-line pt-4 space-y-2.5">
          <div className="text-[9px] uppercase tracking-widest text-faint font-bold mb-1">
            Execute Diagnostic Command:
          </div>
          <div className="grid grid-cols-1 gap-2">
            {PROMPT_META.map((p) => (
              <button
                key={p.id}
                onClick={() => handleCommand(p.id)}
                disabled={isTyping}
                className="w-full text-left rounded-lg border border-line bg-ink hover:bg-surface-2 hover:border-calm/40 hover:text-calm px-3.5 py-2.5 transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex flex-col gap-0.5 group"
              >
                <span className="text-[11px] font-mono font-bold text-text group-hover:text-calm transition">
                  {p.label}
                </span>
                <span className="text-[9px] text-faint uppercase tracking-wider">
                  {p.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        <footer className="text-center text-[9px] uppercase tracking-widest text-faint pt-1 opacity-70">
          GEMINI CO-PILOT // CONTEXT: {threats.length} THREATS
        </footer>
      </div>
    </>
  );
}

// Sub-component for typing text animation
function TypewriterText({ text, speed = 4 }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let idx = 0;
    setDisplayed("");
    const timer = setInterval(() => {
      if (idx < text.length) {
        setDisplayed((d) => d + text.charAt(idx));
        idx++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <div className="whitespace-pre-wrap">{displayed}</div>;
}
