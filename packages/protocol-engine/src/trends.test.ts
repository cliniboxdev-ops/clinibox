import { describe, expect, it } from "vitest";
import { analyzeTrend, type AssessmentPoint } from "./trends";

const NOW = Date.parse("2026-08-24T12:00:00.000Z");
const HOUR = 3_600_000;

/** Build a point `hoursAgo` before NOW. */
function point(hoursAgo: number, over: Partial<AssessmentPoint> = {}): AssessmentPoint {
  return {
    timestamp: new Date(NOW - hoursAgo * HOUR).toISOString(),
    news2Total: 0,
    risk: "low",
    spo2: 98,
    pulse: 72,
    systolicBP: 120,
    respiratoryRate: 16,
    ...over,
  };
}

describe("analyzeTrend", () => {
  it("reports insufficient data below the minimum assessment count", () => {
    const r = analyzeTrend([point(4), point(2)], 24, NOW);
    expect(r.direction).toBe("insufficient-data");
    expect(r.actions).toEqual(["need_more_assessments"]);
  });

  it("reports insufficient data when assessments span too short a window", () => {
    const r = analyzeTrend([point(1), point(0.5), point(0)], 24, NOW);
    expect(r.direction).toBe("insufficient-data");
    expect(r.hoursObserved).toBe(1);
  });

  it("suggests morning discharge after sustained low-risk stability", () => {
    const pts = [8, 6, 4, 2, 0].map((h) => point(h));
    const r = analyzeTrend(pts, 24, NOW);
    expect(r.direction).toBe("stable");
    expect(r.hoursObserved).toBe(8);
    expect(r.actions).toContain("discharge_candidate_morning");
  });

  it("does not suggest discharge when stability is too brief", () => {
    const pts = [3, 2, 1, 0].map((h) => point(h));
    const r = analyzeTrend(pts, 24, NOW);
    expect(r.direction).toBe("stable");
    expect(r.actions).not.toContain("discharge_candidate_morning");
    expect(r.actions).toContain("continue_monitoring");
  });

  it("does not suggest discharge if any assessment in the window was not low risk", () => {
    const pts = [
      point(8, { news2Total: 3, risk: "low-medium" }),
      point(6),
      point(4),
      point(2),
      point(0),
    ];
    const r = analyzeTrend(pts, 24, NOW);
    expect(r.actions).not.toContain("discharge_candidate_morning");
  });

  it("detects the falling-SpO2 with rising-pulse slide and urges transfer within 24h", () => {
    // 20h of gradual decline: SpO2 98 -> 90, pulse 72 -> 108
    const pts = [20, 16, 12, 8, 4, 0].map((h, i) =>
      point(h, { spo2: 98 - i * 2, pulse: 72 + i * 8 }),
    );
    const r = analyzeTrend(pts, 24, NOW);
    expect(r.direction).toBe("worsening");
    expect(r.deltas.spo2).toBeLessThanOrEqual(-3);
    expect(r.deltas.pulse).toBeGreaterThanOrEqual(10);
    expect(r.actions).toContain("escalate_transfer_24h");
  });

  it("detects a rising NEWS2 score as worsening", () => {
    const pts = [
      point(9, { news2Total: 1 }),
      point(6, { news2Total: 2 }),
      point(3, { news2Total: 4 }),
      point(0, { news2Total: 5, risk: "medium" }),
    ];
    const r = analyzeTrend(pts, 24, NOW);
    expect(r.direction).toBe("worsening");
    expect(r.actions).toContain("escalate_transfer_24h");
  });

  it("escalates immediately when the latest assessment is high risk", () => {
    const pts = [
      point(5, { news2Total: 2 }),
      point(3, { news2Total: 4 }),
      point(1, { news2Total: 6 }),
      point(0, { news2Total: 8, risk: "high" }),
    ];
    const r = analyzeTrend(pts, 24, NOW);
    expect(r.direction).toBe("worsening");
    expect(r.actions).toEqual(["escalate_immediate"]);
  });

  it("flags short-window deterioration for review rather than transfer", () => {
    const pts = [
      point(3, { news2Total: 1 }),
      point(2, { news2Total: 2 }),
      point(1, { news2Total: 4 }),
      point(0, { news2Total: 4, risk: "low-medium" }),
    ];
    const r = analyzeTrend(pts, 24, NOW);
    expect(r.direction).toBe("worsening");
    expect(r.actions).toContain("review_deterioration");
    expect(r.actions).toContain("extend_observation");
    expect(r.actions).not.toContain("escalate_transfer_24h");
  });

  it("recognizes recovery as improving", () => {
    const pts = [
      point(8, { news2Total: 6, risk: "medium" }),
      point(6, { news2Total: 5, risk: "medium" }),
      point(4, { news2Total: 2, risk: "low" }),
      point(2, { news2Total: 1, risk: "low" }),
      point(0, { news2Total: 1, risk: "low" }),
    ];
    const r = analyzeTrend(pts, 24, NOW);
    expect(r.direction).toBe("improving");
  });

  it("ignores assessments older than the window", () => {
    const pts = [
      point(40, { news2Total: 9, risk: "high" }), // outside 24h
      point(6),
      point(4),
      point(2),
      point(0),
    ];
    const r = analyzeTrend(pts, 24, NOW);
    expect(r.assessmentCount).toBe(4);
    expect(r.direction).toBe("stable");
  });

  it("is order-independent", () => {
    const pts = [point(0), point(6), point(2), point(8), point(4)];
    const a = analyzeTrend(pts, 24, NOW);
    const b = analyzeTrend([...pts].reverse(), 24, NOW);
    expect(a).toEqual(b);
  });
});
