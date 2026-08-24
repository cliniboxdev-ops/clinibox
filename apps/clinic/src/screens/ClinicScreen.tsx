import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  DEVICE_IDS,
  FACILITY_CATEGORIES,
  PERSONNEL_ROLES,
  loadProfile,
  saveProfile,
  startPowerFeed,
  type ClinicProfile,
  type DeviceId,
  type PersonnelRole,
  type PowerStatus,
} from "../clinic-profile";
import { useI18n } from "../i18n";
import { COLORS } from "../theme";

const POWER_STATE_COLORS: Record<PowerStatus["state"], string> = {
  ok: COLORS.tealDark,
  unstable: COLORS.warn,
  down: COLORS.error,
};

export default function ClinicScreen() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [power, setPower] = useState<PowerStatus | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    loadProfile().then(setProfile);
    return startPowerFeed(setPower);
  }, []);

  if (!profile) return null;

  // functional updates: several taps in the same render batch must not
  // overwrite each other (rapid tapping through the checklists is normal)
  const update = (patch: Partial<ClinicProfile>) => {
    setSavedMsg(false);
    setProfile((p) => (p ? { ...p, ...patch } : p));
  };

  const addPersonnel = (role: PersonnelRole, delta: number) => {
    setSavedMsg(false);
    setProfile((p) =>
      p
        ? {
            ...p,
            personnel: {
              ...p.personnel,
              [role]: Math.max(0, p.personnel[role] + delta),
            },
          }
        : p,
    );
  };

  const addBeds = (delta: number) => {
    setSavedMsg(false);
    setProfile((p) => (p ? { ...p, beds: Math.max(0, p.beds + delta) } : p));
  };

  const toggleDevice = (id: DeviceId) => {
    setSavedMsg(false);
    setProfile((p) => (p ? { ...p, devices: { ...p.devices, [id]: !p.devices[id] } } : p));
  };

  const onSave = async () => {
    await saveProfile(profile);
    setSavedMsg(true);
  };

  return (
    <ScrollView style={styles.body}>
      {/* power — reported by the Clinibox unit, not editable */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.clinic.powerLabel}</Text>
        {power && (
          <View style={styles.powerRow}>
            <View
              style={[styles.powerDot, { backgroundColor: POWER_STATE_COLORS[power.state] }]}
            />
            <Text style={styles.powerText}>
              {t.clinic.powerSource[power.source]} · {t.clinic.powerState[power.state]} ·{" "}
              {t.clinic.battery} {power.batteryPct}%
            </Text>
          </View>
        )}
        <Text style={styles.powerNote}>
          {t.clinic.reportedBy}
          {power ? ` · ${new Date(power.updatedAt).toLocaleTimeString()}` : ""}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t.clinic.nameLabel}</Text>
        <TextInput
          style={styles.input}
          value={profile.name}
          onChangeText={(name) => update({ name })}
          placeholder={t.clinic.namePlaceholder}
          placeholderTextColor={COLORS.muted}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>{t.clinic.categoryLabel}</Text>
        <View style={styles.chipCol}>
          {FACILITY_CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => update({ category: c })}
              style={[styles.catRow, profile.category === c && styles.catRowActive]}
            >
              <Text
                style={[styles.catText, profile.category === c && styles.catTextActive]}
              >
                {t.clinic.categories[c]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>{t.clinic.bedsLabel}</Text>
        <Counter value={profile.beds} onDelta={addBeds} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.clinic.personnelLabel}</Text>
        {PERSONNEL_ROLES.map((role) => (
          <View key={role} style={styles.roleRow}>
            <Text style={styles.roleText}>{t.clinic.roles[role]}</Text>
            <Counter
              value={profile.personnel[role]}
              onDelta={(d) => addPersonnel(role, d)}
            />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.clinic.devicesLabel}</Text>
        <View style={styles.deviceGrid}>
          {DEVICE_IDS.map((d) => (
            <Pressable
              key={d}
              onPress={() => toggleDevice(d)}
              style={[styles.deviceChip, profile.devices[d] && styles.deviceChipOn]}
            >
              <Text
                style={[styles.deviceText, profile.devices[d] && styles.deviceTextOn]}
              >
                {profile.devices[d] ? "✓ " : ""}
                {t.clinic.deviceNames[d]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {savedMsg && <Text style={styles.saved}>{t.clinic.savedMsg}</Text>}
      <Pressable style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveBtnText}>{t.clinic.save}</Text>
      </Pressable>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/** Emits a delta rather than an absolute value so rapid taps accumulate. */
function Counter({ value, onDelta }: { value: number; onDelta: (d: number) => void }) {
  return (
    <View style={styles.counter}>
      <Pressable style={styles.counterBtn} onPress={() => onDelta(-1)}>
        <Text style={styles.counterBtnText}>−</Text>
      </Pressable>
      <Text style={styles.counterValue}>{value}</Text>
      <Pressable style={styles.counterBtn} onPress={() => onDelta(1)}>
        <Text style={styles.counterBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.navy, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.ink, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.ink,
    backgroundColor: "#fbfdff",
  },
  chipCol: { gap: 6 },
  catRow: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#fbfdff",
  },
  catRowActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  catText: { fontSize: 13.5, color: COLORS.ink },
  catTextActive: { color: "#fff", fontWeight: "600" },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  roleText: { fontSize: 14, color: COLORS.ink, flex: 1 },
  counter: { flexDirection: "row", alignItems: "center", gap: 10 },
  counterBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  counterValue: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.ink,
  },
  deviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  deviceChip: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fbfdff",
  },
  deviceChipOn: { backgroundColor: COLORS.teal, borderColor: COLORS.tealDark },
  deviceText: { fontSize: 12.5, color: COLORS.ink },
  deviceTextOn: { color: "#fff", fontWeight: "600" },
  powerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  powerDot: { width: 12, height: 12, borderRadius: 6 },
  powerText: { fontSize: 15, fontWeight: "600", color: COLORS.ink },
  powerNote: { marginTop: 6, fontSize: 12, color: COLORS.muted },
  saved: { color: COLORS.tealDark, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  saveBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
