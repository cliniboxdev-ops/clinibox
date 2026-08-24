import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Clinic profile: what this facility is, who works here, and what equipment
 * it has. Stored locally like everything else. Facility categories follow
 * Peru's MINSA establishment categorization (NTS 021-MINSA/DGSP).
 *
 * Power status is NOT part of the editable profile — it is reported by the
 * Clinibox unit's hardware (battery/mains sensing). Until real hardware is
 * connected, a simulated feed stands in behind the same interface.
 */

export type FacilityCategory =
  | "I-1"
  | "I-2"
  | "I-3"
  | "I-4"
  | "II-1"
  | "II-2"
  | "III-1"
  | "III-2";

export const FACILITY_CATEGORIES: FacilityCategory[] = [
  "I-1",
  "I-2",
  "I-3",
  "I-4",
  "II-1",
  "II-2",
  "III-1",
  "III-2",
];

export type PersonnelRole =
  | "physician"
  | "nurse"
  | "obstetrician"
  | "nursing_technician"
  | "health_promoter";

export const PERSONNEL_ROLES: PersonnelRole[] = [
  "physician",
  "nurse",
  "obstetrician",
  "nursing_technician",
  "health_promoter",
];

export type DeviceId =
  | "vitals_monitor"
  | "pulse_oximeter"
  | "bp_monitor"
  | "thermometer"
  | "ecg"
  | "aed"
  | "oxygen_concentrator"
  | "ultrasound";

export const DEVICE_IDS: DeviceId[] = [
  "vitals_monitor",
  "pulse_oximeter",
  "bp_monitor",
  "thermometer",
  "ecg",
  "aed",
  "oxygen_concentrator",
  "ultrasound",
];

export interface ClinicProfile {
  name: string;
  category: FacilityCategory;
  beds: number;
  personnel: Record<PersonnelRole, number>;
  devices: Record<DeviceId, boolean>;
}

export const DEFAULT_PROFILE: ClinicProfile = {
  name: "",
  category: "I-1",
  beds: 0,
  personnel: {
    physician: 0,
    nurse: 1,
    obstetrician: 0,
    nursing_technician: 1,
    health_promoter: 0,
  },
  devices: {
    vitals_monitor: true,
    pulse_oximeter: true,
    bp_monitor: true,
    thermometer: true,
    ecg: false,
    aed: false,
    oxygen_concentrator: false,
    ultrasound: false,
  },
};

const STORAGE_KEY = "clinibox.clinic-profile.v1";

export async function loadProfile(): Promise<ClinicProfile> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PROFILE;
  return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<ClinicProfile>) };
}

export async function saveProfile(profile: ClinicProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/** Power status as reported by the Clinibox unit. */
export interface PowerStatus {
  source: "grid" | "solar" | "battery";
  state: "ok" | "unstable" | "down";
  batteryPct: number;
  updatedAt: string;
}

/**
 * Simulated Clinibox power report: mains mostly OK with occasional
 * instability, battery topped up while mains present, draining otherwise.
 * The real unit will publish the same shape over the device link.
 */
export function startPowerFeed(
  onStatus: (s: PowerStatus) => void,
  intervalMs = 3000,
): () => void {
  let battery = 82;
  let unstableTicks = 0;

  const emit = () => {
    if (unstableTicks > 0) {
      unstableTicks--;
      battery = Math.max(5, battery - 0.6);
    } else {
      if (Math.random() < 0.06) unstableTicks = 3;
      battery = Math.min(98, battery + 0.4);
    }
    const state: PowerStatus["state"] = unstableTicks > 0 ? "unstable" : "ok";
    onStatus({
      source: unstableTicks > 0 ? "battery" : "grid",
      state,
      batteryPct: Math.round(battery),
      updatedAt: new Date().toISOString(),
    });
  };

  emit();
  const timer = setInterval(emit, intervalMs);
  return () => clearInterval(timer);
}
