import AsyncStorage from "@react-native-async-storage/async-storage";
import type { News2Result } from "@clinibox/protocol-engine";
import type { VitalsSample } from "./telemetry";
import type { StoredPatient } from "./patients";

/**
 * Per-patient clinical event log (offline, append-only).
 * Everything that happened to a patient lands here; the "what needs to be
 * done next" list is derived deterministically from the latest state, never
 * stored — so it can't go stale.
 */

interface BaseEvent {
  id: string;
  patientId: string;
  timestamp: string;
}

export interface RegistrationEvent extends BaseEvent {
  type: "registration";
}

export interface AssessmentEvent extends BaseEvent {
  type: "assessment";
  vitals: VitalsSample;
  news2: Pick<News2Result, "total" | "risk" | "redFlag">;
  /** true for synthetic training/demo data — never real patient measurements */
  demo?: boolean;
}

export type ClinicalEvent = RegistrationEvent | AssessmentEvent;

const STORAGE_KEY = "clinibox.events.v1";

function makeId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadAll(): Promise<ClinicalEvent[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ClinicalEvent[]) : [];
}

export async function listEvents(patientId: string): Promise<ClinicalEvent[]> {
  const all = await loadAll();
  return all
    .filter((e) => e.patientId === patientId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function addEvent(
  event: Omit<RegistrationEvent, "id" | "timestamp"> | Omit<AssessmentEvent, "id" | "timestamp">,
): Promise<ClinicalEvent> {
  const full = {
    ...event,
    id: makeId(),
    timestamp: new Date().toISOString(),
  } as ClinicalEvent;
  const all = await loadAll();
  all.push(full);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return full;
}

/**
 * Seeds synthetic back-dated assessments so trend analysis can be
 * demonstrated and practised without waiting hours. Events are tagged
 * `demo: true` and labelled in the UI.
 */
export async function seedDemoHistory(
  patientId: string,
  shape: "stable" | "deteriorating",
  hours = 12,
  count = 6,
): Promise<void> {
  const all = await loadAll();
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    // oldest first, evenly spaced across the window
    const progress = i / (count - 1);
    const timestamp = new Date(now - (hours - progress * hours) * 3_600_000).toISOString();

    const vitals: VitalsSample =
      shape === "stable"
        ? {
            respiratoryRate: 16,
            spo2: 97,
            onSupplementalOxygen: false,
            systolicBP: 118,
            pulse: 74,
            consciousness: "alert",
            temperatureC: 36.8,
            timestamp,
            source: "simulator",
          }
        : {
            respiratoryRate: Math.round(16 + progress * 8),
            spo2: Math.round(97 - progress * 8),
            onSupplementalOxygen: progress > 0.7,
            systolicBP: Math.round(120 - progress * 25),
            pulse: Math.round(74 + progress * 40),
            consciousness: "alert",
            temperatureC: Number((36.8 + progress * 1.6).toFixed(1)),
            timestamp,
            source: "simulator",
          };

    const total =
      shape === "stable"
        ? 0
        : Math.round(progress * 6); // rises across the window
    const risk: News2Result["risk"] =
      total >= 7 ? "high" : total >= 5 ? "medium" : total >= 3 ? "low-medium" : "low";

    all.push({
      type: "assessment",
      id: makeId(),
      patientId,
      timestamp,
      vitals,
      news2: { total, risk, redFlag: false },
      demo: true,
    });
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Deterministic to-do codes derived from patient state; i18n maps to text. */
export type NextStepCode =
  | "record_vitals"
  | "routine_monitoring_12h"
  | "urgent_review"
  | "monitor_hourly"
  | "teleconsult"
  | "emergency_care"
  | "continuous_monitoring"
  | "consider_evacuation"
  | "sync_pending";

export function deriveNextSteps(
  patient: StoredPatient | undefined,
  events: ClinicalEvent[],
): NextStepCode[] {
  const steps: NextStepCode[] = [];
  const latestAssessment = events.find((e): e is AssessmentEvent => e.type === "assessment");

  if (!latestAssessment) {
    steps.push("record_vitals");
  } else {
    switch (latestAssessment.news2.risk) {
      case "low":
        steps.push("routine_monitoring_12h");
        break;
      case "low-medium":
        steps.push("urgent_review", "monitor_hourly");
        break;
      case "medium":
        steps.push("urgent_review", "teleconsult", "monitor_hourly");
        break;
      case "high":
        steps.push("emergency_care", "continuous_monitoring", "consider_evacuation");
        break;
    }
  }

  if (patient && !patient.synced) steps.push("sync_pending");
  return steps;
}
