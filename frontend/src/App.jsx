import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { useSentinel } from "./hooks/useSentinel.js";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Auth from "./pages/Auth.jsx";
import LockdownOverlay from "./components/LockdownOverlay.jsx";
import CopilotChat from "./components/CopilotChat.jsx";
import TopBar from "./components/TopBar.jsx";
import ThreatHero from "./components/ThreatHero.jsx";
import SpikeChart from "./components/SpikeChart.jsx";
import EventFeed from "./components/EventFeed.jsx";
import AttackControls from "./components/AttackControls.jsx";
import ThreatLogs from "./pages/ThreatLogs.jsx";
import BlockchainMonitor from "./pages/BlockchainMonitor.jsx";
import UPIAnalyzer from "./pages/UPIAnalyzer.jsx";
import DatabaseAnalyzer from "./pages/DatabaseAnalyzer.jsx";

const NAV = [
  { to: "/", label: "Live Console", icon: "⬤" },
  { to: "/upi", label: "UPI Analyzer", icon: "₹" },
  { to: "/database", label: "DB Analyzer", icon: "⊞" },
  { to: "/threats", label: "Threat Logs", icon: "☰" },
  { to: "/blockchain", label: "Blockchain", icon: "◈" },
];

function Sidebar() {
  const { logout, user } = useAuth();
  return (
    <nav className="flex flex-col gap-1 border-r border-line bg-surface/60 px-3 py-4 w-44 shrink-0">
      <div className="mb-4 px-2 text-[9px] uppercase tracking-[0.3em] text-faint">Navigation</div>
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === "/"}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
              isActive
                ? "bg-calm/10 text-calm ring-1 ring-calm/20"
                : "text-muted hover:bg-ink hover:text-text"
            }`
          }
        >
          <span className="text-[10px] opacity-60">{n.icon}</span>
          {n.label}
        </NavLink>
      ))}

      <div className="mt-auto border-t border-line pt-3">
        <div className="px-2 text-[9px] uppercase tracking-[0.3em] text-faint mb-2">Sources</div>
        {[
          { label: "UPI Payments", dot: "#f59e0b" },
          { label: "Auth / Login", dot: "var(--color-auth)" },
          { label: "Database", dot: "var(--color-db)" },
          { label: "Blockchain", dot: "#a78bfa" },
          { label: "Transactions", dot: "var(--color-txn)" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
            <span className="text-[10px] text-faint">{s.label}</span>
          </div>
        ))}

        <div className="mt-4 border-t border-line/40 pt-3">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-threat/80 hover:text-threat hover:bg-threat/10 transition-colors text-left cursor-pointer"
          >
            <span className="text-[10px] opacity-80">⎋</span>
            Sign Out
          </button>
          <div className="px-3 mt-1.5 text-[9px] text-faint truncate" title={user?.email}>
            {user?.displayName || "Agent"}
          </div>
        </div>
      </div>
    </nav>
  );
}

function LiveConsole({ s, onResolve }) {
  return (
    <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1.7fr_1fr]">
      <div className="flex min-h-0 flex-col gap-4">
        <ThreatHero threat={s.activeThreat} onResolve={onResolve} />
        <SpikeChart entity={s.focusEntity} series={s.focusSeries} />
        <AttackControls
          entities={s.entities}
          attacks={s.attacks}
          onInject={s.inject}
          defaultEntity={s.focusEntity}
        />
      </div>
      <EventFeed events={s.events} />
    </main>
  );
}

function Layout({ s }) {
  const loc = useLocation();
  const underThreat = Boolean(s.activeThreat);
  const isLive = loc.pathname === "/";
  const { isLocked, triggerLockdown } = useAuth();

  useEffect(() => {
    if (s.activeThreat && s.activeThreat.risk_score >= 90) {
      triggerLockdown();
    }
  }, [s.activeThreat, triggerLockdown]);

  return (
    <div className="flex h-full flex-col">
      {isLocked && <LockdownOverlay />}
      <CopilotChat />
      <TopBar connected={s.connected} underThreat={underThreat} counts={s.counts} onPanic={triggerLockdown} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <Routes>
            <Route path="/" element={<LiveConsole s={s} onResolve={s.resolveActiveThreat} />} />
            <Route path="/upi" element={<UPIAnalyzer />} />
            <Route path="/database" element={<DatabaseAnalyzer />} />
            <Route path="/threats" element={<ThreatLogs />} />
            <Route path="/blockchain" element={<BlockchainMonitor />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const s = useSentinel();
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout s={s} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
