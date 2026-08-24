/**
 * Normalized medical protocol schema — the single shape every connector
 * (WikEM, seed algorithms, future sources) must produce. The app and the
 * offline index consume only this.
 */

export type ProtocolCategory = "resuscitation" | "triage" | "trauma" | "pediatric";

export type TriageOutcome =
  | "immediate"
  | "delayed"
  | "minor"
  | "expectant"
  | "emergency"
  | "priority"
  | "routine";

/** Flat vital-sign threshold rule, machine-evaluable by the trigger engine. */
export interface VitalTrigger {
  /** human-readable form of the rule, shown in the UI */
  description: string;
  parameter?:
    | "respiratoryRate"
    | "spo2"
    | "systolicBP"
    | "pulse"
    | "capillaryRefillSec"
    | "consciousness";
  op?: "<" | "<=" | ">" | ">=" | "==";
  value?: number | string;
  outcome: TriageOutcome;
}

export interface ProtocolSection {
  heading: string;
  level: number;
  paragraphs: string[];
  steps: string[];
}

export interface ProtocolSource {
  name: string;
  url: string;
  license: string;
  licenseUrl?: string;
  revisionId?: number | null;
  fetchedAt: string;
}

export interface ProtocolDocument {
  id: string;
  title: string;
  lang: "en" | "es";
  category: ProtocolCategory;
  /** 1 = life-threatening/emergency use, 2 = urgent, 3 = reference */
  severityTier?: 1 | 2 | 3;
  triggers?: VitalTrigger[];
  contraindications?: string[];
  sections: ProtocolSection[];
  source: ProtocolSource;
}
