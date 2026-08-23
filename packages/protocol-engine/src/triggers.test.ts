import { describe, expect, it } from "vitest";
import { TriggerEngine } from "./triggers";
import type { VitalsInput } from "./news2";

const stable: VitalsInput = {
  respiratoryRate: 16,
  spo2: 98,
  onSupplementalOxygen: false,
  systolicBP: 120,
  pulse: 72,
  consciousness: "alert",
  temperatureC: 36.8,
};

describe("TriggerEngine", () => {
  it("stays monitoring on stable vitals", () => {
    const e = new TriggerEngine();
    for (let i = 0; i < 50; i++) expect(e.feed(stable).state).toBe("monitoring");
  });

  it("triggers respiratory distress on SpO2<90 + HR>120 (combined rule)", () => {
    const e = new TriggerEngine();
    // one threshold alone must NOT trigger
    expect(e.feed({ ...stable, spo2: 89 }).state).toBe("monitoring");
    expect(e.feed({ ...stable, pulse: 125 }).state).toBe("monitoring");
    // both together must trigger instantly
    const s = e.feed({ ...stable, spo2: 89, pulse: 125 });
    expect(s).toMatchObject({ state: "critical", condition: "respiratory_distress" });
  });

  it("triggers respiratory distress on absolute SpO2 floor (<85)", () => {
    const e = new TriggerEngine();
    expect(e.feed({ ...stable, spo2: 84 })).toMatchObject({
      state: "critical",
      condition: "respiratory_distress",
    });
  });

  it("triggers shock on SBP<=90 + HR>=110", () => {
    const e = new TriggerEngine();
    expect(e.feed({ ...stable, systolicBP: 88, pulse: 112 })).toMatchObject({
      state: "critical",
      condition: "shock",
    });
  });

  it("prioritizes unresponsiveness over other conditions", () => {
    const e = new TriggerEngine();
    const s = e.feed({
      ...stable,
      consciousness: "unresponsive",
      spo2: 80,
      pulse: 130,
    });
    expect(s).toMatchObject({ state: "critical", condition: "unresponsive" });
  });

  it("latches: stays critical even if vitals recover, until resolved", () => {
    const e = new TriggerEngine();
    e.feed({ ...stable, spo2: 84 });
    expect(e.feed(stable).state).toBe("critical"); // recovered sample, still latched
    e.resolve();
    expect(e.current.state).toBe("monitoring");
    expect(e.feed(stable).state).toBe("monitoring");
  });

  it("silences the acknowledged condition during the grace window, then re-arms", () => {
    const e = new TriggerEngine();
    const bad = { ...stable, spo2: 84 };
    const t = (s: number) => new Date(1700000000000 + s * 1000).toISOString();
    e.feed(bad, t(0));
    e.resolve(t(5)); // 60s grace by default
    expect(e.feed(bad, t(30)).state).toBe("monitoring"); // silenced
    expect(e.feed(bad, t(66)).state).toBe("critical"); // grace expired, re-arms
  });

  it("fires immediately for a different condition during the grace window", () => {
    const e = new TriggerEngine();
    const t = (s: number) => new Date(1700000000000 + s * 1000).toISOString();
    e.feed({ ...stable, spo2: 84 }, t(0));
    e.resolve(t(5));
    const s = e.feed({ ...stable, systolicBP: 85, pulse: 118, spo2: 96 }, t(10));
    expect(s).toMatchObject({ state: "critical", condition: "shock" });
  });

  it("triggers autonomously on a degrading crash sequence", () => {
    const e = new TriggerEngine();
    // synthetic crash: SpO2 falls 98 -> 83, pulse climbs 72 -> 135
    let triggeredAt = -1;
    for (let i = 0; i <= 15; i++) {
      const s = e.feed({
        ...stable,
        spo2: 98 - i,
        pulse: 72 + i * 4,
      });
      if (s.state === "critical" && triggeredAt === -1) triggeredAt = i;
    }
    expect(triggeredAt).toBeGreaterThan(0);
    // spo2 89 + pulse 108 at i=9 -> not yet; i=13: spo2 85? combined rule hits
    // when spo2<90 AND pulse>120: i=13 -> spo2 85, pulse 124
    expect(triggeredAt).toBe(13);
    expect(e.current).toMatchObject({ condition: "respiratory_distress" });
  });
});
