import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-ink">
        <div className="relative flex items-center justify-center">
          {/* Inner pulsating dot */}
          <span className="absolute h-4 w-4 rounded-full bg-calm animate-ping opacity-75" />
          {/* Outer spin border */}
          <div className="h-12 w-12 rounded-full border-2 border-line border-t-calm animate-spin" />
        </div>
        <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-calm font-mono font-medium animate-pulse">
          Decrypting secure session...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
