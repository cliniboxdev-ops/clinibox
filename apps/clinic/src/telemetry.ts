import type { Consciousness, VitalsInput } from "@clinibox/protocol-engine";

/**
 * Vitals telemetry ingestion layer.
 *
 * `VitalsDriver` is the single interface the UI consumes. Today the only
 * implementation is the on-device simulator; the BLE driver for real
 * sensors (GATT: pulse oximeter 0x1822, blood pressure 0x1810, heart rate
 * 0x180D, thermometer 0x1809) will implement the same interface in a
 * native dev build, so no UI changes are needed to go from simulated to
 * real hardware.
 */

export interface VitalsSample extends VitalsInput {
  timestamp: string;
  source: "simulator" | "ble";
}

export interface VitalsDriver {
  /** Begin emitting samples. Returns a stop function. */
  start(onSample: (sample: VitalsSample) => void): () => void;
}

export type Scenario = "estable" | "deterioro" | "sepsis";

export const SCENARIO_LABELS: Record<Scenario, string> = {
  estable: "Paciente estable",
  deterioro: "Deterioro progresivo",
  sepsis: "Cuadro séptico",
};

interface ScenarioProfile {
  from: VitalsInput;
  to: VitalsInput;
  /** seconds to evolve from `from` to `to` */
  durationS: number;
  /** progress (0..1) after which consciousness switches to `to.consciousness` */
  consciousnessAt: number;
}

const ALERT: Consciousness = "alert";

const PROFILES: Record<Scenario, ScenarioProfile> = {
  estable: {
    from: { respiratoryRate: 16, spo2: 98, onSupplementalOxygen: false, systolicBP: 118, pulse: 72, consciousness: ALERT, temperatureC: 36.8 },
    to: { respiratoryRate: 16, spo2: 98, onSupplementalOxygen: false, systolicBP: 118, pulse: 72, consciousness: ALERT, temperatureC: 36.8 },
    durationS: 60,
    consciousnessAt: 1.1,
  },
  deterioro: {
    from: { respiratoryRate: 18, spo2: 96, onSupplementalOxygen: false, systolicBP: 112, pulse: 88, consciousness: ALERT, temperatureC: 37.2 },
    to: { respiratoryRate: 26, spo2: 89, onSupplementalOxygen: true, systolicBP: 86, pulse: 126, consciousness: "voice", temperatureC: 38.4 },
    durationS: 60,
    consciousnessAt: 0.8,
  },
  sepsis: {
    from: { respiratoryRate: 22, spo2: 94, onSupplementalOxygen: false, systolicBP: 100, pulse: 108, consciousness: ALERT, temperatureC: 38.9 },
    to: { respiratoryRate: 28, spo2: 91, onSupplementalOxygen: true, systolicBP: 88, pulse: 128, consciousness: "confusion", temperatureC: 39.6 },
    durationS: 45,
    consciousnessAt: 0.5,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function jitter(value: number, amount: number): number {
  return value + (Math.random() - 0.5) * 2 * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Simulated Clinibox sensor feed: evolves vitals from a scenario's baseline
 * toward its target over `durationS`, with physiological jitter on top.
 */
export function createSimulatorDriver(
  scenario: Scenario,
  intervalMs = 2000,
): VitalsDriver {
  return {
    start(onSample) {
      const profile = PROFILES[scenario];
      const startedAt = Date.now();

      const emit = () => {
        const t = clamp((Date.now() - startedAt) / 1000 / profile.durationS, 0, 1);
        const { from, to } = profile;
        const sample: VitalsSample = {
          respiratoryRate: Math.round(clamp(jitter(lerp(from.respiratoryRate, to.respiratoryRate, t), 1), 4, 60)),
          spo2: Math.round(clamp(jitter(lerp(from.spo2, to.spo2, t), 0.7), 50, 100)),
          onSupplementalOxygen: t > 0.6 ? to.onSupplementalOxygen : from.onSupplementalOxygen,
          systolicBP: Math.round(clamp(jitter(lerp(from.systolicBP, to.systolicBP, t), 3), 50, 260)),
          pulse: Math.round(clamp(jitter(lerp(from.pulse, to.pulse, t), 3), 20, 220)),
          consciousness: t >= profile.consciousnessAt ? to.consciousness : from.consciousness,
          temperatureC: Number(clamp(jitter(lerp(from.temperatureC, to.temperatureC, t), 0.15), 33, 42).toFixed(1)),
          timestamp: new Date().toISOString(),
          source: "simulator",
        };
        onSample(sample);
      };

      emit();
      const timer = setInterval(emit, intervalMs);
      return () => clearInterval(timer);
    },
  };
}
