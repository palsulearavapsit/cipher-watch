/**
 * MITRE ATT&CK mappings for CipherWatch attack kinds.
 *
 * Each entry maps a CipherWatch threat type keyword → MITRE ATT&CK Tactic + Technique.
 * Reference: https://attack.mitre.org/
 */

export const TACTICS = [
  "Reconnaissance",
  "Resource Development",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command & Control",
  "Exfiltration",
  "Impact",
];

// Full technique catalog used in CipherWatch detections
export const TECHNIQUES = {
  T1110: {
    id: "T1110",
    name: "Brute Force",
    tactic: "Credential Access",
    url: "https://attack.mitre.org/techniques/T1110/",
    description:
      "Adversaries may use brute force techniques to gain access to accounts when passwords are unknown or when password hashes are obtained.",
  },
  T1078: {
    id: "T1078",
    name: "Valid Accounts",
    tactic: "Initial Access",
    url: "https://attack.mitre.org/techniques/T1078/",
    description:
      "Adversaries may obtain and abuse credentials of existing accounts to bypass access controls.",
  },
  T1190: {
    id: "T1190",
    name: "Exploit Public-Facing Application",
    tactic: "Initial Access",
    url: "https://attack.mitre.org/techniques/T1190/",
    description:
      "Adversaries may attempt to exploit a weakness in an Internet-facing host or system.",
  },
  T1486: {
    id: "T1486",
    name: "Data Encrypted for Impact",
    tactic: "Impact",
    url: "https://attack.mitre.org/techniques/T1486/",
    description:
      "Adversaries may encrypt data on target systems or on large numbers of systems in a network to interrupt availability.",
  },
  T1485: {
    id: "T1485",
    name: "Data Destruction",
    tactic: "Impact",
    url: "https://attack.mitre.org/techniques/T1485/",
    description:
      "Adversaries may destroy data and files on specific systems or in large numbers on a network to interrupt availability.",
  },
  T1657: {
    id: "T1657",
    name: "Financial Theft",
    tactic: "Impact",
    url: "https://attack.mitre.org/techniques/T1657/",
    description:
      "Adversaries may steal monetary resources from targets through extortion, social engineering, technical theft, or other methods.",
  },
  T1565: {
    id: "T1565",
    name: "Data Manipulation",
    tactic: "Impact",
    url: "https://attack.mitre.org/techniques/T1565/",
    description:
      "Adversaries may insert, delete, or manipulate data in order to influence external outcomes or hide activity.",
  },
  T1498: {
    id: "T1498",
    name: "Network Denial of Service",
    tactic: "Impact",
    url: "https://attack.mitre.org/techniques/T1498/",
    description:
      "Adversaries may perform Network Denial of Service (DoS) attacks to degrade or block the availability of targeted resources.",
  },
  T1530: {
    id: "T1530",
    name: "Data from Cloud Storage",
    tactic: "Collection",
    url: "https://attack.mitre.org/techniques/T1530/",
    description:
      "Adversaries may access data objects from improperly secured cloud storage.",
  },
  T1041: {
    id: "T1041",
    name: "Exfiltration Over C2 Channel",
    tactic: "Exfiltration",
    url: "https://attack.mitre.org/techniques/T1041/",
    description:
      "Adversaries may steal data by exfiltrating it over an existing command and control channel.",
  },
};

/**
 * Maps a CipherWatch threat type string → one or more MITRE technique IDs.
 * The type field from Firebase/backend is matched by keyword.
 */
export const TYPE_TO_TECHNIQUES = {
  // auth / credential attacks
  credential_stuffing: ["T1110", "T1078"],
  auth_anomaly: ["T1110", "T1078"],
  brute_force: ["T1110"],

  // transaction / volume attacks
  volume_spike: ["T1498", "T1657"],
  transaction_anomaly: ["T1657", "T1565"],
  upi_fraud: ["T1657", "T1190"],
  upi_anomaly: ["T1657", "T1190"],

  // database attacks
  mass_delete: ["T1485", "T1565"],
  database_anomaly: ["T1485", "T1565"],
  sql_injection: ["T1190", "T1485"],

  // blockchain attacks
  blockchain_anomaly: ["T1657", "T1530"],
  wallet_drain: ["T1657", "T1041"],
  smart_contract: ["T1657", "T1565"],
};

/**
 * Resolves a threat's type string to its MITRE technique objects.
 * Falls back gracefully if no mapping is found.
 *
 * @param {string} type - The threat type from Firebase (e.g. "credential_stuffing")
 * @returns {{ techniqueIds: string[], techniques: object[] }}
 */
export function resolveMitre(type) {
  if (!type) return { techniqueIds: [], techniques: [] };

  const normalized = type.toLowerCase().replace(/[\s-]/g, "_");

  // Direct match
  if (TYPE_TO_TECHNIQUES[normalized]) {
    const ids = TYPE_TO_TECHNIQUES[normalized];
    return { techniqueIds: ids, techniques: ids.map((id) => TECHNIQUES[id]).filter(Boolean) };
  }

  // Fuzzy keyword match
  for (const [key, ids] of Object.entries(TYPE_TO_TECHNIQUES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { techniqueIds: ids, techniques: ids.map((id) => TECHNIQUES[id]).filter(Boolean) };
    }
  }

  // Source-based fallback
  if (normalized.includes("upi")) {
    const ids = ["T1657", "T1190"];
    return { techniqueIds: ids, techniques: ids.map((id) => TECHNIQUES[id]).filter(Boolean) };
  }
  if (normalized.includes("auth") || normalized.includes("credential")) {
    const ids = ["T1110", "T1078"];
    return { techniqueIds: ids, techniques: ids.map((id) => TECHNIQUES[id]).filter(Boolean) };
  }
  if (normalized.includes("database") || normalized.includes("delete")) {
    const ids = ["T1485", "T1565"];
    return { techniqueIds: ids, techniques: ids.map((id) => TECHNIQUES[id]).filter(Boolean) };
  }
  if (normalized.includes("blockchain") || normalized.includes("wallet")) {
    const ids = ["T1657", "T1530"];
    return { techniqueIds: ids, techniques: ids.map((id) => TECHNIQUES[id]).filter(Boolean) };
  }

  return { techniqueIds: [], techniques: [] };
}

/** Tactic color palette for the ATT&CK matrix cells */
export const TACTIC_COLORS = {
  "Reconnaissance":       "oklch(65% 0.14 270)",
  "Resource Development": "oklch(65% 0.14 250)",
  "Initial Access":       "oklch(62% 0.16 305)",
  "Execution":            "oklch(60% 0.17 20)",
  "Persistence":          "oklch(62% 0.16 45)",
  "Privilege Escalation": "oklch(66% 0.18 60)",
  "Defense Evasion":      "oklch(65% 0.15 85)",
  "Credential Access":    "oklch(72% 0.17 305)",
  "Discovery":            "oklch(67% 0.14 178)",
  "Lateral Movement":     "oklch(68% 0.16 210)",
  "Collection":           "oklch(65% 0.15 240)",
  "Command & Control":    "oklch(60% 0.18 20)",
  "Exfiltration":         "oklch(64% 0.21 25)",
  "Impact":               "oklch(64% 0.21 25)",
};
