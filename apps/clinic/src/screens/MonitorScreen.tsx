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
import type { Scenario } from "../telemetry";
import { addEvent } from "../events";
import { useI18n } from "../i18n";
import { COLORS } from "../theme";
import { useVitals } from "../vitals-context";

const SCENARIOS: Scenario[] = ["estable", "deterioro", "sepsis", "crash"];

const RISK_COLORS: Record<News2Result["risk"], string> = {
  low: COLORS.tealDark,
  "low-medium": COLORS.warn,
  medium: COLORS.warn,
  high: COLORS.error,
};

export default function MonitorScreen() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const dualPane = width >= 900;

  const { scenario, setScenario, sample } = useVitals();
  const [patients, setPatients] = useState<StoredPatient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    listPatients().then((p) => {
      setPatients(p);
      if (p.length > 0) setSelectedId((id) => id ?? p[0].patient.id);
    });
  }, []);

  const result = useMemo(() => (sample ? scoreNews2(sample) : null), [sample]);
  const selected = patients.find((p) => p.patient.id === selectedId);
  const [recordMsg, setRecordMsg] = useState<string | null>(null);

  const onRecord = async () => {
    if (!selected || !sample || !result) {
      setRecordMsg(t.mon.recordNeedsPatient);
      return;
    }
    await addEvent({
      type: "assessment",
      patientId: selected.patient.id,
      vitals: sample,
      news2: { total: result.total, risk: result.risk, redFlag: result.redFlag },
    });
    setRecordMsg(t.mon.recorded);
    setTimeout(() => setRecordMsg(null), 4000);
  };

  return (
    <ScrollView style={styles.body}>
      {/* patient + scenario selectors */}
      <View style={styles.selectorCard}>
        <Text style={styles.selectorLabel}>{t.mon.patient}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {patients.length === 0 && (
              <Text style={styles.emptyText}>{t.mon.noPatients}</Text>
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
        <Text style={[styles.selectorLabel, { marginTop: 10 }]}>{t.mon.simulator}</Text>
        <View style={styles.chipRow}>
          {SCENARIOS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setScenario(s)}
              style={[styles.chip, s === scenario && styles.chipActive]}
            >
              <Text style={[styles.chipText, s === scenario && styles.chipTextActive]}>
                {t.mon.scenarios[s]}
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
            ⚠ {t.mon.alarm} — {t.mon.risk[result.risk]}
            {selected
              ? ` · ${selected.patient.name[0].given.join(" ")} ${selected.patient.name[0].family}`
              : ""}
          </Text>
        </View>
      )}

      <View style={[styles.panes, dualPane && styles.panesRow]}>
        {/* left pane: live vitals */}
        <View style={[styles.pane, dualPane && styles.paneHalf]}>
          <Text style={styles.paneTitle}>{t.mon.liveVitals}</Text>
          {!sample && <Text style={styles.emptyText}>{t.mon.connecting}</Text>}
          {sample && (
            <View style={styles.tileGrid}>
              <VitalTile label={t.mon.rr} value={`${sample.respiratoryRate}`} unit="rpm" />
              <VitalTile label={t.mon.spo2} value={`${sample.spo2}`} unit="%" />
              <VitalTile label={t.mon.sbp} value={`${sample.systolicBP}`} unit="mmHg" />
              <VitalTile label={t.mon.pulse} value={`${sample.pulse}`} unit="bpm" />
              <VitalTile label={t.mon.temp} value={sample.temperatureC.toFixed(1)} unit="°C" />
              <VitalTile
                label={t.mon.consciousness}
                value={t.mon.consciousnessLabels[sample.consciousness]}
                unit=""
              />
            </View>
          )}
          {sample && (
            <Text style={styles.sourceNote}>
              {t.mon.source(sample.source)} ·{" "}
              {new Date(sample.timestamp).toLocaleTimeString()}
              {sample.onSupplementalOxygen ? ` · ${t.mon.suppO2}` : ""}
            </Text>
          )}
        </View>

        {/* right pane: protocol guidance */}
        <View style={[styles.pane, dualPane && styles.paneHalf]}>
          <Text style={styles.paneTitle}>{t.mon.protocolTitle}</Text>
          {result && (
            <>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreValue}>{result.total}</Text>
                <View style={[styles.riskBadge, { backgroundColor: RISK_COLORS[result.risk] }]}>
                  <Text style={styles.riskBadgeText}>{t.mon.risk[result.risk]}</Text>
                </View>
              </View>
              <Text style={styles.recommendation}>{t.mon.recommendation[result.risk]}</Text>
              <Text style={styles.componentsTitle}>{t.mon.componentsTitle}</Text>
              <View style={styles.componentList}>
                <ComponentRow label={t.mon.rr} score={result.components.respiratoryRate} />
                <ComponentRow label={t.mon.spo2} score={result.components.spo2} />
                <ComponentRow label={t.mon.componentO2} score={result.components.supplementalOxygen} />
                <ComponentRow label={t.mon.sbp} score={result.components.systolicBP} />
                <ComponentRow label={t.mon.pulse} score={result.components.pulse} />
                <ComponentRow label={t.mon.consciousness} score={result.components.consciousness} />
                <ComponentRow label={t.mon.temp} score={result.components.temperature} />
              </View>
              <Pressable style={styles.recordBtn} onPress={onRecord}>
                <Text style={styles.recordBtnText}>{t.mon.record}</Text>
              </Pressable>
              {recordMsg && <Text style={styles.recordMsg}>{recordMsg}</Text>}
              <Text style={styles.protocolNote}>{t.mon.protocolNote}</Text>
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
  recordBtn: {
    marginTop: 14,
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  recordBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  recordMsg: { marginTop: 8, color: COLORS.tealDark, fontWeight: "600", fontSize: 13 },
});
