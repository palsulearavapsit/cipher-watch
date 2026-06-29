import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Auth() {
  const { user, login, signup, resetPassword, loginDemo } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("login"); // 'login' | 'signup' | 'reset'
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(false);

  // If user is already authenticated, redirect to live console
  if (user) {
    return <Navigate to="/" replace />;
  }

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
    setSuccess(null);
  };

  const getReadableError = (errCode) => {
    switch (errCode) {
      case "auth/invalid-email":
        return "Invalid email address format.";
      case "auth/user-disabled":
        return "This account has been disabled by administrators.";
      case "auth/user-not-found":
        return "Access denied: identity records not found.";
      case "auth/wrong-password":
        return "Access denied: incorrect security credentials.";
      case "auth/email-already-in-use":
        return "Security record already exists for this email.";
      case "auth/weak-password":
        return "Weak credentials: password must be at least 6 characters.";
      case "auth/missing-password":
        return "Authentication requires a password.";
      case "auth/invalid-credential":
        return "Access denied: invalid credentials.";
      case "auth/operation-not-allowed":
        return "Email/Password accounts are not enabled in this Firebase project.";
      default:
        return errCode ? `Authentication error: ${errCode}` : "Secure connection failed. Please try again.";
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all security fields.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(form.email, form.password, rememberMe);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getReadableError(err.code || err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("All security registry fields are required.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Credentials mismatch: Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Weak credentials: password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signup(form.email, form.password, form.name);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getReadableError(err.code || err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!form.email) {
      setError("Registered email address is required to recover access.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await resetPassword(form.email);
      setSuccess("Security recovery token dispatched to your email inbox.");
      // Auto return to login after 3 seconds
      setTimeout(() => {
        setTab("login");
        setSuccess(null);
      }, 3500);
    } catch (err) {
      setError(getReadableError(err.code || err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleDemoLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginDemo();
      navigate("/", { replace: true });
    } catch (err) {
      setError("Failed to initialize Demo Session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-ink select-none relative overflow-hidden px-4 py-8 md:p-12">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-calm/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-threat/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Logo */}
      <header className="w-full flex justify-center mb-8">
        <div className="flex items-center gap-3">
          <div className="relative grid h-9 w-9 place-items-center rounded-md bg-ink ring-1 ring-line">
            <span
              className="h-3.5 w-3.5 rounded-sm"
              style={{
                background: "var(--color-calm)",
                boxShadow: "0 0 12px var(--color-calm)",
              }}
            />
          </div>
          <div className="leading-tight text-left">
            <div className="text-sm font-semibold tracking-[0.2em] text-text">
              CIPHER<span className="text-calm">WATCH</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-faint">
              Threat Detection Platform
            </div>
          </div>
        </div>
      </header>

      {/* Center Card */}
      <main className="flex-1 flex items-center justify-center py-4">
        <div className="w-full md:w-[35%] lg:w-[30%] min-w-[320px] max-w-[440px] rounded-xl border border-line bg-surface/40 backdrop-blur-md p-6 shadow-2xl transition-all duration-300">
          
          {/* Tab Switcher (Not shown on reset screen) */}
          {tab !== "reset" ? (
            <div className="flex border-b border-line mb-6">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 pb-3 text-center text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 cursor-pointer ${
                  tab === "login"
                    ? "border-calm text-calm"
                    : "border-transparent text-faint hover:text-text"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 pb-3 text-center text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 cursor-pointer ${
                  tab === "signup"
                    ? "border-calm text-calm"
                    : "border-transparent text-faint hover:text-text"
                }`}
              >
                Register
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-line">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError(null);
                  setSuccess(null);
                }}
                className="text-[10px] text-calm hover:underline cursor-pointer uppercase tracking-widest font-bold"
              >
                ← Back
              </button>
              <div className="text-[11px] font-bold uppercase tracking-widest text-text ml-auto">
                Recover Credentials
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="mb-4 rounded-lg border border-threat-dim bg-threat/10 p-3 text-[12px] text-threat flex items-start gap-2.5 animate-pulse">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-calm/40 bg-calm/10 p-3 text-[12px] text-calm flex items-start gap-2.5">
              <span className="mt-0.5">✓</span>
              <span>{success}</span>
            </div>
          )}

          {/* Form Content */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field
                label="Identity Email"
                placeholder="analyst@cipherwatch.ai"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
              />
              <Field
                label="Passphrase"
                placeholder="••••••••••••"
                type="password"
                value={form.password}
                onChange={(v) => set("password", v)}
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-muted hover:text-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-calm bg-ink border-line rounded h-3.5 w-3.5 cursor-pointer focus:ring-0 outline-none"
                  />
                  <span>Remember session</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTab("reset");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-calm hover:underline cursor-pointer tracking-wider text-[11px] font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-calm/10 border border-calm/30 py-3 text-[13px] font-bold uppercase tracking-widest text-calm hover:bg-calm/20 hover:border-calm disabled:opacity-50 transition cursor-pointer mt-2"
              >
                {busy ? "Authenticating…" : "Sign In →"}
              </button>
            </form>
          )}

          {tab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Field
                label="Full Name"
                placeholder="Agent Mulder"
                type="text"
                value={form.name}
                onChange={(v) => set("name", v)}
              />
              <Field
                label="Identity Email"
                placeholder="analyst@cipherwatch.ai"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
              />
              <Field
                label="Passphrase"
                placeholder="••••••••••••"
                type="password"
                value={form.password}
                onChange={(v) => set("password", v)}
              />
              <Field
                label="Confirm Passphrase"
                placeholder="••••••••••••"
                type="password"
                value={form.confirmPassword}
                onChange={(v) => set("confirmPassword", v)}
              />

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-calm/10 border border-calm/30 py-3 text-[13px] font-bold uppercase tracking-widest text-calm hover:bg-calm/20 hover:border-calm disabled:opacity-50 transition cursor-pointer mt-2"
              >
                {busy ? "Registering…" : "Register Identity →"}
              </button>
            </form>
          )}

          {tab === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="text-[12px] text-muted leading-relaxed mb-1">
                Enter your registered identity email. We will issue a secure link to reset your security credentials.
              </div>
              <Field
                label="Identity Email"
                placeholder="analyst@cipherwatch.ai"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
              />

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-calm/10 border border-calm/30 py-3 text-[13px] font-bold uppercase tracking-widest text-calm hover:bg-calm/20 hover:border-calm disabled:opacity-50 transition cursor-pointer mt-2"
              >
                {busy ? "Issuing Link…" : "Issue Recovery Link →"}
              </button>
            </form>
          )}

          {/* Predefined Demo Bypass (Always visible) */}
          <div className="mt-6 pt-6 border-t border-line">
            <div className="text-[9px] uppercase tracking-[0.25em] text-faint text-center mb-3">
              Developer Sandbox Access
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={busy}
              className="w-full rounded-lg bg-calm/5 border border-calm/20 py-3.5 text-[11px] font-bold uppercase tracking-widest text-calm transition-all duration-300 hover:bg-calm/15 hover:border-calm hover:shadow-[0_0_12px_rgba(128,255,255,0.1)] cursor-pointer disabled:opacity-50"
            >
              {busy ? "Decrypting Session..." : "Continue as Demo User →"}
            </button>
          </div>

        </div>
      </main>

      {/* Footer System Status */}
      <footer className="w-full flex justify-center text-[9px] uppercase tracking-[0.3em] text-faint">
        SYSTEM STATUS: ONLINE // SECURED CONNECTION // TLS 1.3
      </footer>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-faint mb-1.5 font-medium">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-[13px] text-text outline-none transition-all placeholder-faint/40 focus:border-calm focus:ring-1 focus:ring-calm/20"
      />
    </div>
  );
}
