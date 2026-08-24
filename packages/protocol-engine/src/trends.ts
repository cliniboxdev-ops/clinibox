import type { RiskLevel } from "./news2";

/**
 * Trend engine — clinical direction over time.
 *
 * NEWS2 scores a single moment; this scores the *trajectory* across a
 * patient's recorded assessments, which is what actually drives disposition
 * decisions ("stable all night, dischargeable in the morning" vs "sliding
 * over 24 hours, needs a hospital"). Deterministic and pure: same history
 * in, same recommendation out, no model, no network.
 *
 * Output is decision SUPPORT — advisory codes for a clinician to accept or
 * override, never an autonomous disposition.
 */

export interface AssessmentPoint {
  timestamp: string;
  news2Total: number;
  risk: RiskLevel;
  spo2: number;
  pulse: number;
  systolicBP: number;
  respiratoryRate: number;
}

export type TrendDirection = "improving" | "stable" | "worsening" | "insufficient-data";

export type TrendActionCode =
  | "need_more_assessments"
  | "continue_monitoring"
  | "extend_observation"
  | "discharge_candidate_morning"
  | "review_deterioration"
  | "escalate_transfer_24h"
  | "escalate_immediate";

export interface TrendResult {
  direction: TrendDirection;
  /** hours between first and last assessment considered */
  hoursObserved: number;
  assessmentCount: number;
  /** later-half mean minus earlier-half mean (negative = falling) */
  deltas: { news2: number; spo2: number; pulse: number };
  actions: TrendActionCode[];
}

/** A trend needs at least this many assessments over this many hours. */
export const MIN_POINTS = 3;
export const MIN_HOURS = 2;
/** Sustained-stability window before discharge may be suggested. */
export const STABLE_DISCHARGE_HOURS = 6;
/** Sustained-deterioration window before transfer is urged. */
export const SUSTAINED_HOURS = 6;

const HOUR_MS = 3_600_000;

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * @param points assessments in any order; only the most recent
 *        `windowHours` are considered (default 24).
 */
export function analyzeTrend(
  points: AssessmentPoint[],
  windowHours = 24,
  now: number = Date.now(),
): TrendResult {
  const sorted = [...points]
    .filter((p) => now - Date.parse(p.timestamp) <= windowHours * HOUR_MS)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const empty: TrendResult = {
    direction: "insufficient-data",
    hoursObserved: 0,
    assessmentCount: sorted.length,
    deltas: { news2: 0, spo2: 0, pulse: 0 },
    actions: ["need_more_assessments"],
  };
  if (sorted.length < MIN_POINTS) return empty;

  const hoursObserved = round1(
    (Date.parse(sorted[sorted.length - 1].timestamp) - Date.parse(sorted[0].timestamp)) /
      HOUR_MS,
  );
  if (hoursObserved < MIN_HOURS) return { ...empty, hoursObserved };

  // compare the earlier half of the window against the later half
  const mid = Math.floor(sorted.length / 2);
  const early = sorted.slice(0, mid);
  const late = sorted.slice(sorted.length - mid);
  const deltas = {
    news2: round1(mean(late.map((p) => p.news2Total)) - mean(early.map((p) => p.news2Total))),
    spo2: round1(mean(late.map((p) => p.spo2)) - mean(early.map((p) => p.spo2))),
    pulse: round1(mean(late.map((p) => p.pulse)) - mean(early.map((p) => p.pulse))),
  };

  const latest = sorted[sorted.length - 1];
  const allLowRisk = sorted.every((p) => p.risk === "low");

  // worsening: escalating score, or the classic combined slide of
  // falling saturation with a compensating rising heart rate
  const worsening =
    deltas.news2 >= 2 || (deltas.spo2 <= -3 && deltas.pulse >= 10);
  const improving = deltas.news2 <= -2 && !worsening;

  let direction: TrendDirection;
  if (worsening) direction = "worsening";
  else if (improving) direction = "improving";
  else direction = "stable";

  const actions: TrendActionCode[] = [];
  if (direction === "worsening") {
    if (latest.risk === "high") {
      actions.push("escalate_immediate");
    } else if (hoursObserved >= SUSTAINED_HOURS) {
      actions.push("escalate_transfer_24h", "review_deterioration");
    } else {
      actions.push("review_deterioration", "extend_observation");
    }
  } else if (allLowRisk && hoursObserved >= STABLE_DISCHARGE_HOURS) {
    actions.push("discharge_candidate_morning");
  } else if (latest.risk === "high" || latest.risk === "medium") {
    actions.push("extend_observation");
  } else {
    actions.push("continue_monitoring");
  }

  return { direction, hoursObserved, assessmentCount: sorted.length, deltas, actions };
}
