import type { VitalsInput } from "./news2";

/**
 * Autonomous critical-condition trigger engine.
 *
 * A deterministic, latched state machine that watches the vitals stream and
 * transitions to a critical state the instant a threshold rule matches —
 * independent of any conversational/AI layer, which it is designed to
 * bypass. Pure TypeScript, no timers, no I/O: evaluation is a synchronous
 * function of the sample fed in, so it runs in microseconds and behaves
 * identically on device and in tests.
 *
 * Latching: once critical, the engine stays critical (even if vitals jitter
 * back across the threshold) until a human calls `resolve()`. If the
 * condition still holds on the next sample after resolution, it re-triggers.
 */

export type CriticalConditionId =
  | "unresponsive"
  | "respiratory_distress"
  | "shock";

export interface CriticalCondition {
  id: CriticalConditionId;
  /** strict threshold rule; first match in priority order wins */
  test: (v: VitalsInput) => boolean;
}

/** Ordered by clinical priority. */
export const CRITICAL_CONDITIONS: CriticalCondition[] = [
  {
    id: "unresponsive",
    test: (v) => v.consciousness === "unresponsive",
  },
  {
    id: "respiratory_distress",
    // classic combined-threshold rule + an absolute floor
    test: (v) => (v.spo2 < 90 && v.pulse > 120) || v.spo2 < 85,
  },
  {
    id: "shock",
    test: (v) => v.systolicBP <= 90 && v.pulse >= 110,
  },
];

export type TriggerStatus =
  | { state: "monitoring" }
  | { state: "critical"; condition: CriticalConditionId; since: string };

/** After acknowledgement, the same condition is silenced for this long. */
export const DEFAULT_ACK_GRACE_SECONDS = 60;

export class TriggerEngine {
  private status: TriggerStatus = { state: "monitoring" };
  private suppressed: { condition: CriticalConditionId; untilMs: number } | null = null;

  /** Feed one vitals sample; returns the (possibly new) status. */
  feed(v: VitalsInput, timestamp: string = new Date().toISOString()): TriggerStatus {
    if (this.status.state === "critical") return this.status;
    const hit = CRITICAL_CONDITIONS.find((c) => c.test(v));
    if (hit) {
      // acknowledged condition stays silenced during its grace window;
      // a different condition still fires immediately
      const sup = this.suppressed;
      if (sup && sup.condition === hit.id && Date.parse(timestamp) < sup.untilMs) {
        return this.status;
      }
      this.suppressed = null;
      this.status = { state: "critical", condition: hit.id, since: timestamp };
    }
    return this.status;
  }

  /**
   * Human acknowledgement that the critical episode is handled. The same
   * condition re-arms after `graceSeconds` (alarm-acknowledgement pattern);
   * any other condition can trigger immediately.
   */
  resolve(
    timestamp: string = new Date().toISOString(),
    graceSeconds: number = DEFAULT_ACK_GRACE_SECONDS,
  ): TriggerStatus {
    if (this.status.state === "critical") {
      this.suppressed = {
        condition: this.status.condition,
        untilMs: Date.parse(timestamp) + graceSeconds * 1000,
      };
    }
    this.status = { state: "monitoring" };
    return this.status;
  }

  get current(): TriggerStatus {
    return this.status;
  }
}
