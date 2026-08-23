/**
 * NEWS2 — National Early Warning Score 2 (Royal College of Physicians, UK).
 * https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/
 *
 * Deterministic scoring of physiological vitals into a clinical risk band
 * and recommended response. Pure function of its inputs: no I/O, no
 * randomness, no network — safe to run identically on the Clinibox device,
 * the clinic app, and the server.
 *
 * Scale 1 SpO2 scoring only (Scale 2, for hypercapnic respiratory failure,
 * must be clinician-prescribed; add it when that workflow exists).
 */

/** ACVPU consciousness level. Anything other than "alert" scores 3. */
export type Consciousness = "alert" | "confusion" | "voice" | "pain" | "unresponsive";

export interface VitalsInput {
  /** breaths per minute */
  respiratoryRate: number;
  /** peripheral oxygen saturation, percent */
  spo2: number;
  /** true if the patient is on supplemental oxygen */
  onSupplementalOxygen: boolean;
  /** systolic blood pressure, mmHg */
  systolicBP: number;
  /** heart rate, beats per minute */
  pulse: number;
  consciousness: Consciousness;
  /** body temperature, °C */
  temperatureC: number;
}

export type RiskLevel = "low" | "low-medium" | "medium" | "high";

export interface News2Result {
  protocol: "NEWS2";
  total: number;
  /** per-parameter sub-scores, for display and audit */
  components: {
    respiratoryRate: number;
    spo2: number;
    supplementalOxygen: number;
    systolicBP: number;
    pulse: number;
    consciousness: number;
    temperature: number;
  };
  risk: RiskLevel;
  /** true when any single parameter scored 3 */
  redFlag: boolean;
  /** clinical response recommendation, Spanish (es-PE) */
  recommendation: string;
}

interface Band {
  max: number;
  score: number;
}

/** Score a value against ordered bands: first band whose max >= value wins. */
function band(value: number, bands: Band[]): number {
  for (const b of bands) {
    if (value <= b.max) return b.score;
  }
  return bands[bands.length - 1].score;
}

function validateFinite(input: VitalsInput): void {
  const fields: [string, number][] = [
    ["respiratoryRate", input.respiratoryRate],
    ["spo2", input.spo2],
    ["systolicBP", input.systolicBP],
    ["pulse", input.pulse],
    ["temperatureC", input.temperatureC],
  ];
  for (const [name, value] of fields) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`NEWS2: ${name} inválido: ${value}`);
    }
  }
  if (input.spo2 > 100) {
    throw new RangeError(`NEWS2: spo2 fuera de rango: ${input.spo2}`);
  }
}

const RECOMMENDATIONS: Record<RiskLevel, string> = {
  low: "Riesgo bajo. Continuar monitoreo rutinario (mínimo cada 12 horas).",
  "low-medium":
    "Riesgo bajo-medio: un parámetro en nivel crítico. Revisión urgente por personal de salud competente y aumentar frecuencia de monitoreo (mínimo cada hora).",
  medium:
    "Riesgo medio. Revisión urgente por personal de salud competente; considerar teleconsulta médica inmediata y monitoreo mínimo cada hora.",
  high: "Riesgo alto. EMERGENCIA: atención médica inmediata, monitoreo continuo de signos vitales y evaluar traslado/evacuación del paciente.",
};

export function scoreNews2(input: VitalsInput): News2Result {
  validateFinite(input);

  const components = {
    respiratoryRate: band(input.respiratoryRate, [
      { max: 8, score: 3 },
      { max: 11, score: 1 },
      { max: 20, score: 0 },
      { max: 24, score: 2 },
      { max: Infinity, score: 3 },
    ]),
    spo2: band(input.spo2, [
      { max: 91, score: 3 },
      { max: 93, score: 2 },
      { max: 95, score: 1 },
      { max: Infinity, score: 0 },
    ]),
    supplementalOxygen: input.onSupplementalOxygen ? 2 : 0,
    systolicBP: band(input.systolicBP, [
      { max: 90, score: 3 },
      { max: 100, score: 2 },
      { max: 110, score: 1 },
      { max: 219, score: 0 },
      { max: Infinity, score: 3 },
    ]),
    pulse: band(input.pulse, [
      { max: 40, score: 3 },
      { max: 50, score: 1 },
      { max: 90, score: 0 },
      { max: 110, score: 1 },
      { max: 130, score: 2 },
      { max: Infinity, score: 3 },
    ]),
    consciousness: input.consciousness === "alert" ? 0 : 3,
    temperature: band(input.temperatureC, [
      { max: 35.0, score: 3 },
      { max: 36.0, score: 1 },
      { max: 38.0, score: 0 },
      { max: 39.0, score: 1 },
      { max: Infinity, score: 2 },
    ]),
  };

  const total = Object.values(components).reduce((a, b) => a + b, 0);
  const redFlag = Object.values(components).some((s) => s === 3);

  let risk: RiskLevel;
  if (total >= 7) risk = "high";
  else if (total >= 5) risk = "medium";
  else if (redFlag) risk = "low-medium";
  else risk = "low";

  return {
    protocol: "NEWS2",
    total,
    components,
    risk,
    redFlag,
    recommendation: RECOMMENDATIONS[risk],
  };
}
