import { Threat, WalletActivity, Alert } from "../types";

export const mockThreats: Threat[] = [
  { id: "THR-001", type: "Wallet Fraud", score: 92, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), status: "active" },
  { id: "THR-002", type: "DB Attack", score: 87, timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), status: "investigating" },
  { id: "THR-003", type: "Unauthorized Access", score: 65, timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), status: "resolved" },
  { id: "THR-004", type: "Phishing Attempt", score: 45, timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), status: "active" },
  { id: "THR-005", type: "Brute Force", score: 78, timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(), status: "investigating" },
  { id: "THR-006", type: "DDoS", score: 82, timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), status: "investigating" }
];

export const mockWalletActivity: WalletActivity[] = [
  { wallet: "0x4f2a7b8c9d0e1f2a3b4c5d6e7f8a9b1c2d3e4f5a", amount: 15.2, status: "normal" },
  { wallet: "0x9ab1...4f2c", amount: 450.5, status: "flagged" },
  { wallet: "0x1111...2222", amount: 12.0, status: "normal" },
  { wallet: "0x3333...4444", amount: 10000.0, status: "review" },
  { wallet: "0x5555...6666", amount: 200.0, status: "flagged" }
];

export const mockAlerts: Alert[] = [
  { id: "ALT-001", message: "High Risk Activity: Wallet Fraud detected on 0x9ab1...4f2c", type: "error", timestamp: new Date().toISOString() },
  { id: "ALT-002", message: "Multiple failed login attempts from IP 192.168.1.5", type: "warning", timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() }
];

export const mockRiskDistribution = [
  { name: 'High', value: 3, fill: '#ef4444' }, // red-500
  { name: 'Medium', value: 6, fill: '#f97316' }, // orange-500
  { name: 'Low', value: 3, fill: '#22c55e' }, // green-500
];

export const mockThreatsOverTime = [
  { date: 'Mon', count: 5 },
  { date: 'Tue', count: 8 },
  { date: 'Wed', count: 12 },
  { date: 'Thu', count: 7 },
  { date: 'Fri', count: 15 },
  { date: 'Sat', count: 10 },
  { date: 'Sun', count: 12 },
];
