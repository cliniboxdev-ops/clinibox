import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { News2Result } from "@clinibox/protocol-engine";
import type { Consciousness } from "@clinibox/protocol-engine";
import type { Scenario } from "./telemetry";
import type { RegistrationErrorCode } from "./patients";
import type { NextStepCode } from "./events";

export type Lang = "en" | "es";

const LANG_KEY = "clinibox.lang.v1";

interface Dict {
  tabs: { patients: string; monitor: string; history: string };
  reg: {
    dni: string;
    dniPlaceholder: string;
    given: string;
    givenPlaceholder: string;
    family: string;
    familyPlaceholder: string;
    birth: string;
    birthPlaceholder: string;
    sex: string;
    female: string;
    male: string;
    phone: string;
    phonePlaceholder: string;
    register: string;
    offlineNote: string;
    listTitle: (n: number) => string;
    empty: string;
    unsynced: string;
    saved: (name: string) => string;
    errors: (e: { code: RegistrationErrorCode; dni?: string }) => string;
  };
  mon: {
    patient: string;
    noPatients: string;
    simulator: string;
    scenarios: Record<Scenario, string>;
    liveVitals: string;
    connecting: string;
    rr: string;
    spo2: string;
    sbp: string;
    pulse: string;
    temp: string;
    consciousness: string;
    consciousnessLabels: Record<Consciousness, string>;
    source: (s: "simulator" | "ble") => string;
    suppO2: string;
    protocolTitle: string;
    risk: Record<News2Result["risk"], string>;
    recommendation: Record<News2Result["risk"], string>;
    componentsTitle: string;
    componentO2: string;
    alarm: string;
    protocolNote: string;
    record: string;
    recorded: string;
    recordNeedsPatient: string;
  };
  hist: {
    nextSteps: string;
    timeline: string;
    noEvents: string;
    registrationEvent: string;
    assessmentEvent: (score: number) => string;
    steps: Record<NextStepCode, string>;
    allDone: string;
  };
}

const en: Dict = {
  tabs: { patients: "Patients", monitor: "Monitor", history: "History" },
  reg: {
    dni: "DNI *",
    dniPlaceholder: "8 digits",
    given: "Given names *",
    givenPlaceholder: "María Elena",
    family: "Family names *",
    familyPlaceholder: "Quispe Mamani",
    birth: "Date of birth",
    birthPlaceholder: "YYYY-MM-DD",
    sex: "Sex",
    female: "Female",
    male: "Male",
    phone: "Phone",
    phonePlaceholder: "999 999 999",
    register: "Register patient",
    offlineNote: "Saved on this device — works without internet.",
    listTitle: (n) => `Registered patients (${n})`,
    empty: "No patients registered yet.",
    unsynced: "not synced",
    saved: (name) => `Patient ${name} registered`,
    errors: (e) => {
      switch (e.code) {
        case "dni_invalid":
          return "DNI must be 8 digits";
        case "given_required":
          return "Enter the given names";
        case "family_required":
          return "Enter the family names";
        case "birthdate_invalid":
          return "Date of birth: use YYYY-MM-DD";
        case "duplicate_dni":
          return `A patient with DNI ${e.dni} already exists`;
      }
    },
  },
  mon: {
    patient: "Patient",
    noPatients: "No patients — register one in the Patients tab.",
    simulator: "Sensor simulator (no hardware)",
    scenarios: {
      estable: "Stable patient",
      deterioro: "Progressive deterioration",
      sepsis: "Septic presentation",
    },
    liveVitals: "Live vital signs",
    connecting: "Connecting to sensors…",
    rr: "Respiratory rate",
    spo2: "SpO₂",
    sbp: "Systolic BP",
    pulse: "Pulse",
    temp: "Temperature",
    consciousness: "Consciousness",
    consciousnessLabels: {
      alert: "Alert",
      confusion: "Confusion",
      voice: "Responds to voice",
      pain: "Responds to pain",
      unresponsive: "Unresponsive",
    },
    source: (s) => (s === "simulator" ? "Source: simulator" : "Source: BLE sensors"),
    suppO2: "on supplemental oxygen",
    protocolTitle: "NEWS2 protocol",
    risk: {
      low: "LOW RISK",
      "low-medium": "LOW-MEDIUM RISK",
      medium: "MEDIUM RISK",
      high: "HIGH RISK",
    },
    recommendation: {
      low: "Low risk. Continue routine monitoring (at least every 12 hours).",
      "low-medium":
        "Low-medium risk: one parameter at critical level. Urgent review by competent clinical staff and increase monitoring frequency (at least hourly).",
      medium:
        "Medium risk. Urgent review by competent clinical staff; consider immediate medical teleconsultation and monitor at least hourly.",
      high: "High risk. EMERGENCY: immediate medical attention, continuous vital-sign monitoring, and consider patient transfer/evacuation.",
    },
    componentsTitle: "Score per parameter",
    componentO2: "Supplemental oxygen",
    alarm: "ALARM",
    protocolNote:
      "NEWS2 — Royal College of Physicians. Deterministic assessment computed on-device, offline.",
    record: "Record assessment",
    recorded: "Assessment saved to patient history",
    recordNeedsPatient: "Select a patient to record",
  },
  hist: {
    nextSteps: "What needs to be done",
    timeline: "What has been done",
    noEvents: "No events for this patient yet.",
    registrationEvent: "Patient registered",
    assessmentEvent: (score) => `Vitals assessment — NEWS2 score ${score}`,
    steps: {
      record_vitals: "Record a first vitals assessment",
      routine_monitoring_12h: "Routine monitoring (at least every 12 hours)",
      urgent_review: "Urgent review by clinical staff",
      monitor_hourly: "Monitor vitals at least hourly",
      teleconsult: "Request medical teleconsultation",
      emergency_care: "Immediate emergency medical attention",
      continuous_monitoring: "Continuous vital-sign monitoring",
      consider_evacuation: "Evaluate patient transfer/evacuation",
      sync_pending: "Sync patient record to central server when online",
    },
    allDone: "Nothing pending.",
  },
};

const es: Dict = {
  tabs: { patients: "Pacientes", monitor: "Monitor", history: "Historial" },
  reg: {
    dni: "DNI *",
    dniPlaceholder: "8 dígitos",
    given: "Nombres *",
    givenPlaceholder: "María Elena",
    family: "Apellidos *",
    familyPlaceholder: "Quispe Mamani",
    birth: "Fecha de nacimiento",
    birthPlaceholder: "AAAA-MM-DD",
    sex: "Sexo",
    female: "Femenino",
    male: "Masculino",
    phone: "Teléfono",
    phonePlaceholder: "999 999 999",
    register: "Registrar paciente",
    offlineNote: "Se guarda en este dispositivo — funciona sin internet.",
    listTitle: (n) => `Pacientes registrados (${n})`,
    empty: "Aún no hay pacientes registrados.",
    unsynced: "sin sincronizar",
    saved: (name) => `Paciente ${name} registrado`,
    errors: (e) => {
      switch (e.code) {
        case "dni_invalid":
          return "El DNI debe tener 8 dígitos";
        case "given_required":
          return "Ingrese los nombres";
        case "family_required":
          return "Ingrese los apellidos";
        case "birthdate_invalid":
          return "Fecha de nacimiento: use AAAA-MM-DD";
        case "duplicate_dni":
          return `Ya existe un paciente con DNI ${e.dni}`;
      }
    },
  },
  mon: {
    patient: "Paciente",
    noPatients: "Sin pacientes — registre uno en la pestaña Pacientes.",
    simulator: "Simulador de sensores (sin hardware)",
    scenarios: {
      estable: "Paciente estable",
      deterioro: "Deterioro progresivo",
      sepsis: "Cuadro séptico",
    },
    liveVitals: "Signos vitales en vivo",
    connecting: "Conectando sensores…",
    rr: "Frec. respiratoria",
    spo2: "SpO₂",
    sbp: "Presión sistólica",
    pulse: "Pulso",
    temp: "Temperatura",
    consciousness: "Conciencia",
    consciousnessLabels: {
      alert: "Alerta",
      confusion: "Confusión",
      voice: "Responde a voz",
      pain: "Responde a dolor",
      unresponsive: "No responde",
    },
    source: (s) => (s === "simulator" ? "Fuente: simulador" : "Fuente: sensores BLE"),
    suppO2: "con oxígeno suplementario",
    protocolTitle: "Protocolo NEWS2",
    risk: {
      low: "RIESGO BAJO",
      "low-medium": "RIESGO BAJO-MEDIO",
      medium: "RIESGO MEDIO",
      high: "RIESGO ALTO",
    },
    recommendation: {
      low: "Riesgo bajo. Continuar monitoreo rutinario (mínimo cada 12 horas).",
      "low-medium":
        "Riesgo bajo-medio: un parámetro en nivel crítico. Revisión urgente por personal de salud competente y aumentar frecuencia de monitoreo (mínimo cada hora).",
      medium:
        "Riesgo medio. Revisión urgente por personal de salud competente; considerar teleconsulta médica inmediata y monitoreo mínimo cada hora.",
      high: "Riesgo alto. EMERGENCIA: atención médica inmediata, monitoreo continuo de signos vitales y evaluar traslado/evacuación del paciente.",
    },
    componentsTitle: "Puntaje por parámetro",
    componentO2: "Oxígeno suplementario",
    alarm: "ALARMA",
    protocolNote:
      "NEWS2 — Royal College of Physicians. Evaluación determinística calculada en el dispositivo, sin conexión.",
    record: "Registrar evaluación",
    recorded: "Evaluación guardada en el historial del paciente",
    recordNeedsPatient: "Seleccione un paciente para registrar",
  },
  hist: {
    nextSteps: "Qué falta hacer",
    timeline: "Qué se ha hecho",
    noEvents: "Aún no hay eventos para este paciente.",
    registrationEvent: "Paciente registrado",
    assessmentEvent: (score) => `Evaluación de signos vitales — NEWS2 ${score}`,
    steps: {
      record_vitals: "Registrar una primera evaluación de signos vitales",
      routine_monitoring_12h: "Monitoreo rutinario (mínimo cada 12 horas)",
      urgent_review: "Revisión urgente por personal de salud",
      monitor_hourly: "Monitorear signos vitales mínimo cada hora",
      teleconsult: "Solicitar teleconsulta médica",
      emergency_care: "Atención médica de emergencia inmediata",
      continuous_monitoring: "Monitoreo continuo de signos vitales",
      consider_evacuation: "Evaluar traslado/evacuación del paciente",
      sync_pending: "Sincronizar el registro con el servidor central al tener conexión",
    },
    allDone: "Nada pendiente.",
  },
};

const DICTS: Record<Lang, Dict> = { en, es };

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const I18nContext = createContext<I18nValue>({ lang: "en", setLang: () => {}, t: en });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((stored) => {
      if (stored === "en" || stored === "es") setLangState(stored);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: DICTS[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
