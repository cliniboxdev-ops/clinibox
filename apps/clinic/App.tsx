import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  listPatients,
  registerPatient,
  type NewPatientInput,
  type StoredPatient,
} from "./src/patients";

const COLORS = {
  navy: "#123a5e",
  teal: "#2fb3a6",
  tealDark: "#1f9488",
  ink: "#16324e",
  muted: "#6b7f97",
  bg: "#eef3f8",
  line: "#e3eaf2",
  error: "#c0392b",
};

const EMPTY_FORM: NewPatientInput = {
  dni: "",
  givenNames: "",
  familyName: "",
  birthDate: "",
  phone: "",
};

export default function App() {
  const [form, setForm] = useState<NewPatientInput>(EMPTY_FORM);
  const [patients, setPatients] = useState<StoredPatient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    listPatients().then(setPatients);
  }, []);

  const set = (field: keyof NewPatientInput) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const onSave = useCallback(async () => {
    setError(null);
    setSaved(null);
    const result = await registerPatient(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPatients((p) => [result.stored, ...p]);
    setForm(EMPTY_FORM);
    const name = result.stored.patient.name[0];
    setSaved(`Paciente ${name.given.join(" ")} ${name.family} registrado`);
  }, [form]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.logo}>
          <Text style={{ color: "#fff" }}>Clini</Text>
          <Text style={{ color: COLORS.teal }}>box</Text>
        </Text>
        <Text style={styles.headerSub}>Registro de pacientes</Text>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Field
            label="DNI *"
            value={form.dni}
            onChange={set("dni")}
            placeholder="8 dígitos"
            keyboardType="number-pad"
            maxLength={8}
          />
          <Field
            label="Nombres *"
            value={form.givenNames}
            onChange={set("givenNames")}
            placeholder="María Elena"
          />
          <Field
            label="Apellidos *"
            value={form.familyName}
            onChange={set("familyName")}
            placeholder="Quispe Mamani"
          />
          <Field
            label="Fecha de nacimiento"
            value={form.birthDate ?? ""}
            onChange={set("birthDate")}
            placeholder="AAAA-MM-DD"
          />
          <Text style={styles.label}>Sexo</Text>
          <View style={styles.genderRow}>
            {(
              [
                ["female", "Femenino"],
                ["male", "Masculino"],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() =>
                  setForm((f) => ({
                    ...f,
                    gender: f.gender === value ? undefined : value,
                  }))
                }
                style={[styles.genderBtn, form.gender === value && styles.genderBtnActive]}
              >
                <Text
                  style={[
                    styles.genderText,
                    form.gender === value && styles.genderTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field
            label="Teléfono"
            value={form.phone ?? ""}
            onChange={set("phone")}
            placeholder="999 999 999"
            keyboardType="phone-pad"
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {saved && <Text style={styles.saved}>{saved}</Text>}

          <Pressable style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveBtnText}>Registrar paciente</Text>
          </Pressable>
          <Text style={styles.offlineNote}>
            Se guarda en este dispositivo — funciona sin internet.
          </Text>
        </View>

        <Text style={styles.listTitle}>
          Pacientes registrados ({patients.length})
        </Text>
        {patients.map((p) => (
          <PatientRow key={p.patient.id} stored={p} />
        ))}
        {patients.length === 0 && (
          <Text style={styles.emptyList}>Aún no hay pacientes registrados.</Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={COLORS.muted}
        keyboardType={props.keyboardType ?? "default"}
        maxLength={props.maxLength}
      />
    </View>
  );
}

function PatientRow({ stored }: { stored: StoredPatient }) {
  const { patient } = stored;
  const name = patient.name[0];
  const dni = patient.identifier[0]?.value ?? "—";
  return (
    <View style={styles.patientRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.patientName}>
          {name.given.join(" ")} {name.family}
        </Text>
        <Text style={styles.patientMeta}>
          DNI {dni}
          {patient.birthDate ? ` · ${patient.birthDate}` : ""}
        </Text>
      </View>
      {!stored.synced && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>sin sincronizar</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.navy,
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  logo: { fontSize: 26, fontWeight: "700" },
  headerSub: { color: "#cfe3f5", marginTop: 4, fontSize: 14 },
  body: { flex: 1, padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
  },
  field: { marginBottom: 12 },
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
  genderRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  genderBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fbfdff",
  },
  genderBtnActive: { backgroundColor: COLORS.teal, borderColor: COLORS.tealDark },
  genderText: { color: COLORS.ink, fontWeight: "500" },
  genderTextActive: { color: "#fff", fontWeight: "700" },
  error: { color: COLORS.error, marginBottom: 10, fontWeight: "600" },
  saved: { color: COLORS.tealDark, marginBottom: 10, fontWeight: "600" },
  saveBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  offlineNote: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
  },
  listTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.navy,
  },
  emptyList: { color: COLORS.muted, fontStyle: "italic" },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    marginBottom: 8,
  },
  patientName: { fontSize: 15, fontWeight: "600", color: COLORS.ink },
  patientMeta: { fontSize: 12.5, color: COLORS.muted, marginTop: 2 },
  badge: {
    backgroundColor: "rgba(47,179,166,0.12)",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: COLORS.tealDark, fontSize: 11, fontWeight: "600" },
});
