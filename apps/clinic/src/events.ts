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
