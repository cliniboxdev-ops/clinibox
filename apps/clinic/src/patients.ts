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

export function validateDni(dni: string): string | null {
  if (!/^\d{8}$/.test(dni)) return "El DNI debe tener 8 dígitos";
  return null;
}

export async function listPatients(): Promise<StoredPatient[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredPatient[]) : [];
}

export async function registerPatient(
  input: NewPatientInput,
): Promise<{ ok: true; stored: StoredPatient } | { ok: false; error: string }> {
  const dniError = validateDni(input.dni);
  if (dniError) return { ok: false, error: dniError };
  if (!input.givenNames.trim()) return { ok: false, error: "Ingrese los nombres" };
  if (!input.familyName.trim()) return { ok: false, error: "Ingrese los apellidos" };
  if (input.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) {
    return { ok: false, error: "Fecha de nacimiento: use AAAA-MM-DD" };
  }

  const existing = await listPatients();
  const duplicate = existing.some((p) =>
    p.patient.identifier.some((i) => i.system === DNI_SYSTEM && i.value === input.dni),
  );
  if (duplicate) return { ok: false, error: `Ya existe un paciente con DNI ${input.dni}` };

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
