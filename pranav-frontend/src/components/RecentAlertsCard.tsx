import React from "react";
import { useRecentAlerts } from "../hooks/useRecentAlerts";

export const RecentAlertsCard: React.FC = () => {
  const { alerts } = useRecentAlerts();

  return (
    <div className="bg-[#0a0e17] rounded-xl p-6 border border-slate-800">
      <h3 className="text-lg font-semibold text-white mb-4">
        Recent Alerts
      </h3>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No alerts available
          </p>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="border border-slate-700 rounded-lg p-3"
            >
              <div className="flex justify-between">
                <span className="text-white text-sm font-medium">
                  {alert.message}
                </span>

                <span
                  className={`text-xs ${
                    alert.type === "error"
                      ? "text-red-400"
                      : alert.type === "warning"
                      ? "text-orange-400"
                      : "text-cyan-400"
                  }`}
                >
                  {alert.type.toUpperCase()}
                </span>
              </div>

              <p className="text-slate-500 text-xs mt-1">
                {new Date(
                  alert.timestamp
                ).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};