/**
 * FHIR R4 resource types used by Clinibox.
 *
 * Peru's national EHR interoperability (RENHICE, Law 30024) is built on
 * HL7 FHIR R4 — see MINSA's Dyaku guides: https://dyaku.minsa.gob.pe/guides/
 * We model clinical data as FHIR resources from day one so exports and
 * accreditation don't require a rewrite later.
 *
 * These are pragmatic subsets of the spec — extend fields as features need
 * them, keeping names and structure exactly as FHIR defines them.
 */

export interface Identifier {
  /** e.g. "https://api.reniec.gob.pe/dni" for Peruvian DNI */
  system: string;
  value: string;
}

export interface HumanName {
  family: string;
  given: string[];
}

export interface CodeableConcept {
  coding: { system: string; code: string; display?: string }[];
  text?: string;
}

export interface Quantity {
  value: number;
  unit: string;
  /** UCUM code, e.g. "mm[Hg]", "Cel", "/min" */
  code?: string;
}

export interface Patient {
  resourceType: "Patient";
  id: string;
  identifier: Identifier[];
  name: HumanName[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string; // YYYY-MM-DD
  telecom?: { system: "phone" | "email"; value: string }[];
  address?: { text: string; district?: string; state?: string }[];
}

export interface Encounter {
  resourceType: "Encounter";
  id: string;
  status: "planned" | "in-progress" | "finished" | "cancelled";
  /** virtual = telemedicine, AMB = in-person at the Clinibox */
  class: { system: string; code: "AMB" | "VR"; display?: string };
  subject: { reference: `Patient/${string}` };
  period?: { start: string; end?: string };
}

export interface Observation {
  resourceType: "Observation";
  id: string;
  status: "preliminary" | "final" | "amended";
  /** LOINC-coded, e.g. 8480-6 systolic BP, 8867-4 heart rate */
  code: CodeableConcept;
  subject: { reference: `Patient/${string}` };
  encounter?: { reference: `Encounter/${string}` };
  effectiveDateTime: string;
  valueQuantity?: Quantity;
  valueString?: string;
}

export type CliniboxResource = Patient | Encounter | Observation;
