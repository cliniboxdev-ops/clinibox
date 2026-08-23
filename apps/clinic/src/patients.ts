import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Patient } from "@clinibox/shared";

/**
 * Offline-first patient store.
 *
 * Patients are kept locally on the device (AsyncStorage) so registration
 * works with no connectivity. `synced` marks records that still need to be
 * pushed to the central server — the future sync engine (PowerSync) will
 * replace this layer, so keep all storage access behind these functions.
 */

export const DNI_SYSTEM = "https://api.reniec.gob.pe/dni";

export interface StoredPatient {
  patient: Patient;
  createdAt: string;
  synced: boolean;
}

export interface NewPatientInput {
  dni: string;
  givenNames: string;
  familyName: string;
  birthDate?: string;
  gender?: "male" | "female";
  phone?: string;
}

const STORAGE_KEY = "clinibox.patients.v1";

function makeId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type RegistrationErrorCode =
  | "dni_invalid"
  | "given_required"
  | "family_required"
  | "birthdate_invalid"
  | "duplicate_dni";

export interface RegistrationError {
  code: RegistrationErrorCode;
  dni?: string;
}

export async function listPatients(): Promise<StoredPatient[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredPatient[]) : [];
}

export async function registerPatient(
  input: NewPatientInput,
): Promise<{ ok: true; stored: StoredPatient } | { ok: false; error: RegistrationError }> {
  if (!/^\d{8}$/.test(input.dni)) return { ok: false, error: { code: "dni_invalid" } };
  if (!input.givenNames.trim()) return { ok: false, error: { code: "given_required" } };
  if (!input.familyName.trim()) return { ok: false, error: { code: "family_required" } };
  if (input.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) {
    return { ok: false, error: { code: "birthdate_invalid" } };
  }

  const existing = await listPatients();
  const duplicate = existing.some((p) =>
    p.patient.identifier.some((i) => i.system === DNI_SYSTEM && i.value === input.dni),
  );
  if (duplicate) return { ok: false, error: { code: "duplicate_dni", dni: input.dni } };

  const patient: Patient = {
    resourceType: "Patient",
    id: makeId(),
    identifier: [{ system: DNI_SYSTEM, value: input.dni }],
    name: [
      {
        family: input.familyName.trim(),
        given: input.givenNames.trim().split(/\s+/),
      },
    ],
    ...(input.gender ? { gender: input.gender } : {}),
    ...(input.birthDate ? { birthDate: input.birthDate } : {}),
    ...(input.phone?.trim()
      ? { telecom: [{ system: "phone" as const, value: input.phone.trim() }] }
      : {}),
  };

  const stored: StoredPatient = {
    patient,
    createdAt: new Date().toISOString(),
    synced: false,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([stored, ...existing]));
  return { ok: true, stored };
}
