import { describe, expect, it } from "vitest";
import { scoreNews2, type VitalsInput } from "./news2";

/** Perfectly healthy adult baseline — every parameter scores 0. */
const healthy: VitalsInput = {
  respiratoryRate: 16,
  spo2: 98,
  onSupplementalOxygen: false,
  systolicBP: 120,
  pulse: 70,
  consciousness: "alert",
  temperatureC: 36.8,
};

describe("NEWS2 scoring", () => {
  it("scores a healthy adult as 0 / low risk", () => {
    const r = scoreNews2(healthy);
    expect(r.total).toBe(0);
    expect(r.risk).toBe("low");
    expect(r.redFlag).toBe(false);
  });

  it("scores official RCP band boundaries for respiratory rate", () => {
    const rr = (v: number) => scoreNews2({ ...healthy, respiratoryRate: v }).components.respiratoryRate;
    expect(rr(8)).toBe(3);
    expect(rr(9)).toBe(1);
    expect(rr(11)).toBe(1);
    expect(rr(12)).toBe(0);
    expect(rr(20)).toBe(0);
    expect(rr(21)).toBe(2);
    expect(rr(24)).toBe(2);
    expect(rr(25)).toBe(3);
  });

  it("scores official band boundaries for SpO2 (scale 1)", () => {
    const s = (v: number) => scoreNews2({ ...healthy, spo2: v }).components.spo2;
    expect(s(91)).toBe(3);
    expect(s(92)).toBe(2);
    expect(s(93)).toBe(2);
    expect(s(94)).toBe(1);
    expect(s(95)).toBe(1);
    expect(s(96)).toBe(0);
    expect(s(100)).toBe(0);
  });

  it("scores official band boundaries for systolic BP", () => {
    const bp = (v: number) => scoreNews2({ ...healthy, systolicBP: v }).components.systolicBP;
    expect(bp(90)).toBe(3);
    expect(bp(91)).toBe(2);
    expect(bp(100)).toBe(2);
    expect(bp(101)).toBe(1);
    expect(bp(110)).toBe(1);
    expect(bp(111)).toBe(0);
    expect(bp(219)).toBe(0);
    expect(bp(220)).toBe(3);
  });

  it("scores official band boundaries for pulse", () => {
    const p = (v: number) => scoreNews2({ ...healthy, pulse: v }).components.pulse;
    expect(p(40)).toBe(3);
    expect(p(41)).toBe(1);
    expect(p(50)).toBe(1);
    expect(p(51)).toBe(0);
    expect(p(90)).toBe(0);
    expect(p(91)).toBe(1);
    expect(p(110)).toBe(1);
    expect(p(111)).toBe(2);
    expect(p(130)).toBe(2);
    expect(p(131)).toBe(3);
  });

  it("scores official band boundaries for temperature", () => {
    const t = (v: number) => scoreNews2({ ...healthy, temperatureC: v }).components.temperature;
    expect(t(35.0)).toBe(3);
    expect(t(35.1)).toBe(1);
    expect(t(36.0)).toBe(1);
    expect(t(36.1)).toBe(0);
    expect(t(38.0)).toBe(0);
    expect(t(38.1)).toBe(1);
    expect(t(39.0)).toBe(1);
    expect(t(39.1)).toBe(2);
  });

  it("scores supplemental oxygen as 2 and any non-alert consciousness as 3", () => {
    expect(scoreNews2({ ...healthy, onSupplementalOxygen: true }).components.supplementalOxygen).toBe(2);
    for (const c of ["confusion", "voice", "pain", "unresponsive"] as const) {
      expect(scoreNews2({ ...healthy, consciousness: c }).components.consciousness).toBe(3);
    }
  });

  it("flags a single red-score parameter as low-medium risk", () => {
    const r = scoreNews2({ ...healthy, systolicBP: 88 }); // BP scores 3, total 3
    expect(r.total).toBe(3);
    expect(r.redFlag).toBe(true);
    expect(r.risk).toBe("low-medium");
  });

  it("classifies aggregate 5-6 as medium risk", () => {
    // RR 21-24 (2) + SpO2 94-95 (1) + pulse 91-110 (1) + temp 38.1-39 (1) = 5
    const r = scoreNews2({
      ...healthy,
      respiratoryRate: 22,
      spo2: 95,
      pulse: 100,
      temperatureC: 38.5,
    });
    expect(r.total).toBe(5);
    expect(r.redFlag).toBe(false);
    expect(r.risk).toBe("medium");
  });

  it("classifies aggregate >=7 as high risk (septic-shock-like vitals)", () => {
    const r = scoreNews2({
      respiratoryRate: 28, // 3
      spo2: 90, // 3
      onSupplementalOxygen: true, // 2
      systolicBP: 85, // 3
      pulse: 135, // 3
      consciousness: "voice", // 3
      temperatureC: 39.8, // 2
    });
    expect(r.total).toBe(19);
    expect(r.risk).toBe("high");
    expect(r.recommendation).toContain("EMERGENCIA");
  });

  it("rejects non-physiological inputs", () => {
    expect(() => scoreNews2({ ...healthy, spo2: 130 })).toThrow(RangeError);
    expect(() => scoreNews2({ ...healthy, pulse: NaN })).toThrow(RangeError);
    expect(() => scoreNews2({ ...healthy, respiratoryRate: -3 })).toThrow(RangeError);
  });
});
