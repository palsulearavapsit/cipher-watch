import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert } from "../types";

interface AlertPanelProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,

}) => {
  const [latestAlert, setLatestAlert] =
    useState<Alert | null>(null);

  useEffect(() => {
    if (alerts.length > 0) {
      setLatestAlert(alerts[0]);

      const timer = setTimeout(() => {
        setLatestAlert(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [alerts]);

  if (!latestAlert) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-red-950/90 border border-red-500/40 rounded-xl p-4 w-96 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-1" />

          <div className="flex-1">
            <h4 className="text-red-300 font-semibold">
              New Security Alert
            </h4>

            <p className="text-white text-sm mt-1">
              {latestAlert.message}
            </p>

            <p className="text-slate-400 text-xs mt-2">
              {new Date(
                latestAlert.timestamp
              ).toLocaleTimeString()}
            </p>
          </div>

          <button
            onClick={() =>
              setLatestAlert(null)
            }
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};