export type Threat = {
  id: string;
  type: string;
  score: number;
  timestamp: string;
  status: "active" | "resolved" | "investigating";
};

export type WalletActivity = {
  wallet: string;
  amount: number;
  status: "normal" | "flagged" | "review";
};

export type Alert = {
  id: string;
  message: string;
  type: "warning" | "error" | "info";
  timestamp: string;
};
