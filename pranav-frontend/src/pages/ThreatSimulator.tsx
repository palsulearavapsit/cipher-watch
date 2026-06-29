import React from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export const ThreatSimulator: React.FC = () => {

  const generateThreat = async (
    threatType: string,
    score: number,
    status: "active" | "investigating" | "resolved"
  ) => {
    try {

      const timestamp = new Date().toISOString();

      await addDoc(collection(db, "threats"), {
        id: `THR-${Date.now()}`,
        type: threatType,
        score,
        status,
        timestamp,
      });

      await addDoc(collection(db, "alerts"), {
        id: `ALT-${Date.now()}`,
        message: `${threatType} detected`,
        type: score >= 80 ? "error" : "warning",
        timestamp,
      });

      alert(`${threatType} generated successfully`);

    } catch (error) {
      console.error(error);
      alert("Failed to generate threat");
    }
  };

  return (
    <div className="space-y-6">

      <header>
        <h2 className="text-2xl font-bold text-white">
          Threat Simulator
        </h2>

        <p className="text-slate-400 mt-2">
          Generate simulated cyber threats for live monitoring.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <button
          onClick={() =>
            generateThreat("Wallet Fraud", 95, "active")
          }
          className="p-6 rounded-xl bg-red-950/30 border border-red-500/30 hover:bg-red-900/30 transition"
        >
          💳 Simulate Wallet Fraud
        </button>

        <button
          onClick={() =>
            generateThreat("DDoS Attack", 90, "active")
          }
          className="p-6 rounded-xl bg-orange-950/30 border border-orange-500/30 hover:bg-orange-900/30 transition"
        >
          🌐 Simulate DDoS Attack
        </button>

        <button
          onClick={() =>
            generateThreat("Phishing Attempt", 70, "investigating")
          }
          className="p-6 rounded-xl bg-yellow-950/30 border border-yellow-500/30 hover:bg-yellow-900/30 transition"
        >
          🎣 Simulate Phishing Attempt
        </button>

        <button
          onClick={() =>
            generateThreat("Unauthorized Access", 85, "active")
          }
          className="p-6 rounded-xl bg-cyan-950/30 border border-cyan-500/30 hover:bg-cyan-900/30 transition"
        >
          🔐 Simulate Unauthorized Access
        </button>

      </div>
    </div>
  );
};
