import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { scoreNews2, type News2Result } from "@clinibox/protocol-engine";
import { listPatients, type StoredPatient } from "../patients";
import {
  createSimulatorDriver,
  SCENARIO_LABELS,
  type Scenario,
  type VitalsSample,
} from "../telemetry";
import { COLORS } from "../theme";

const CONSCIOUSNESS_LABELS: Record<VitalsSample["consciousness"], string> = {
  alert: "Alerta",
  confusion: "Confusión",
  voice: "Responde a voz",
  pain: "Responde a dolor",
  unresponsive: "No responde",
};

const RISK_STYLE: Record<News2Result["risk"], { label: string; color: string }> = {
  low: { label: "RIESGO BAJO", color: COLORS.tealDark },
  "low-medium": { label: "RIESGO BAJO-MEDIO", color: COLORS.warn },
  medium: { label: "RIESGO MEDIO", color: COLORS.warn },
  high: { label: "RIESGO ALTO", color: COLORS.error },
};

export default function MonitorScreen() {
  const { width } = useWindowDimensions();
  const dualPane = width >= 900;

  const [patients, setPatients] = useState<StoredPatient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario>("estable");
  const [sample, setSample] = useState<VitalsSample | null>(null);

  useEffect(() => {
    listPatients().then((p) => {
      setPatients(p);
      if (p.length > 0) setSelectedId((id) => id ?? p[0].patient.id);
    });
  }, []);

  useEffect(() => {
    const stop = createSimulatorDriver(scenario).start(setSample);
    return stop;
  }, [scenario]);

  const result = useMemo(() => (sample ? scoreNews2(sample) : null), [sample]);
  const selected = patients.find((p) => p.patient.id === selectedId);

  return (
    <ScrollView style={styles.body}>
      {/* patient + scenario selectors */}
      <View style={styles.selectorCard}>
        <Text style={styles.selectorLabel}>Paciente</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {patients.length === 0 && (
              <Text style={styles.emptyText}>
                Sin pacientes — registre uno en la pestaña Pacientes.
              </Text>
            )}
            {patients.map((p) => (
              <Pressable
                key={p.patient.id}
                onPress={() => setSelectedId(p.patient.id)}
                style={[styles.chip, p.patient.id === selectedId && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    p.patient.id === selectedId && styles.chipTextActive,
                  ]}
                >
                  {p.patient.name[0].given.join(" ")} {p.patient.name[0].family}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Text style={[styles.selectorLabel, { marginTop: 10 }]}>
          Simulador de sensores (sin hardware)
        </Text>
        <View style={styles.chipRow}>
          {(Object.keys(SCENARIO_LABELS) as Scenario[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setScenario(s)}
              style={[styles.chip, s === scenario && styles.chipActive]}
            >
              <Text style={[styles.chipText, s === scenario && styles.chipTextActive]}>
                {SCENARIO_LABELS[s]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* alarm banner */}
      {result && (result.risk === "high" || result.risk === "medium") && (
        <View
          style={[
            styles.alarm,
            { backgroundColor: result.risk === "high" ? COLORS.error : COLORS.warn },
          ]}
        >
          <Text style={styles.alarmText}>
            ⚠ ALARMA — {RISK_STYLE[result.risk].label}
            {selected
              ? ` · ${selected.patient.name[0].given.join(" ")} ${selected.patient.name[0].family}`
              : ""}
          </Text>
        </View>
      )}

      <View style={[styles.panes, dualPane && styles.panesRow]}>
        {/* left pane: live vitals */}
        <View style={[styles.pane, dualPane && styles.paneHalf]}>
          <Text style={styles.paneTitle}>Signos vitales en vivo</Text>
          {!sample && <Text style={styles.emptyText}>Conectando sensores…</Text>}
          {sample && (
            <View style={styles.tileGrid}>
              <VitalTile label="Frec. respiratoria" value={`${sample.respiratoryRate}`} unit="rpm" />
              <VitalTile label="SpO₂" value={`${sample.spo2}`} unit="%" />
              <VitalTile label="Presión sistólica" value={`${sample.systolicBP}`} unit="mmHg" />
              <VitalTile label="Pulso" value={`${sample.pulse}`} unit="lpm" />
              <VitalTile label="Temperatura" value={sample.temperatureC.toFixed(1)} unit="°C" />
              <VitalTile
                label="Conciencia"
                value={CONSCIOUSNESS_LABELS[sample.consciousness]}
                unit=""
              />
            </View>
          )}
          {sample && (
            <Text style={styles.sourceNote}>
              Fuente: {sample.source === "simulator" ? "simulador" : "sensores BLE"} ·{" "}
              {new Date(sample.timestamp).toLocaleTimeString()}
              {sample.onSupplementalOxygen ? " · con oxígeno suplementario" : ""}
            </Text>
          )}
        </View>

        {/* right pane: protocol guidance */}
        <View style={[styles.pane, dualPane && styles.paneHalf]}>
          <Text style={styles.paneTitle}>Protocolo NEWS2</Text>
          {result && (
            <>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreValue}>{result.total}</Text>
                <View
                  style={[styles.riskBadge, { backgroundColor: RISK_STYLE[result.risk].color }]}
                >
                  <Text style={styles.riskBadgeText}>{RISK_STYLE[result.risk].label}</Text>
                </View>
              </View>
              <Text style={styles.recommendation}>{result.recommendation}</Text>
              <Text style={styles.componentsTitle}>Puntaje por parámetro</Text>
              <View style={styles.componentList}>
                <ComponentRow label="Frec. respiratoria" score={result.components.respiratoryRate} />
                <ComponentRow label="SpO₂" score={result.components.spo2} />
                <ComponentRow label="Oxígeno suplementario" score={result.components.supplementalOxygen} />
                <ComponentRow label="Presión sistólica" score={result.components.systolicBP} />
                <ComponentRow label="Pulso" score={result.components.pulse} />
                <ComponentRow label="Conciencia" score={result.components.consciousness} />
                <ComponentRow label="Temperatura" score={result.components.temperature} />
              </View>
              <Text style={styles.protocolNote}>
                NEWS2 — Royal College of Physicians. Evaluación determinística
                calculada en el dispositivo, sin conexión.
              </Text>
            </>
          )}
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function VitalTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>
        {value}
        {unit ? <Text style={styles.tileUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function ComponentRow({ label, score }: { label: string; score: number }) {
  const color = score === 3 ? COLORS.error : score >= 1 ? COLORS.warn : COLORS.tealDark;
  return (
    <View style={styles.componentRow}>
      <Text style={styles.componentLabel}>{label}</Text>
      <View style={[styles.componentScore, { backgroundColor: color }]}>
        <Text style={styles.componentScoreText}>{score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: 16 },
  selectorCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    marginBottom: 12,
  },
  selectorLabel: { fontSize: 13, fontWeight: "600", color: COLORS.ink, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fbfdff",
  },
  chipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  chipText: { color: COLORS.ink, fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  emptyText: { color: COLORS.muted, fontStyle: "italic" },
  alarm: { borderRadius: 10, padding: 12, marginBottom: 12 },
  alarmText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  panes: { gap: 12 },
  panesRow: { flexDirection: "row", alignItems: "flex-start" },
  pane: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
  },
  paneHalf: { flex: 1 },
  paneTitle: { fontSize: 16, fontWeight: "700", color: COLORS.navy, marginBottom: 12 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    minWidth: 140,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fbfdff",
  },
  tileLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  tileValue: { fontSize: 24, fontWeight: "700", color: COLORS.ink },
  tileUnit: { fontSize: 13, fontWeight: "500", color: COLORS.muted },
  sourceNote: { marginTop: 10, fontSize: 12, color: COLORS.muted },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  scoreValue: { fontSize: 44, fontWeight: "800", color: COLORS.navy },
  riskBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  riskBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  recommendation: { fontSize: 14, lineHeight: 21, color: COLORS.ink, marginBottom: 14 },
  componentsTitle: { fontSize: 13, fontWeight: "600", color: COLORS.ink, marginBottom: 8 },
  componentList: { gap: 6 },
  componentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  componentLabel: { fontSize: 13, color: COLORS.ink },
  componentScore: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  componentScoreText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  protocolNote: { marginTop: 12, fontSize: 11.5, color: COLORS.muted },
});
