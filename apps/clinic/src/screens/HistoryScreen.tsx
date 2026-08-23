import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { listPatients, type StoredPatient } from "../patients";
import {
  deriveNextSteps,
  listEvents,
  type ClinicalEvent,
} from "../events";
import { useI18n } from "../i18n";
import { COLORS } from "../theme";

const RISK_COLORS: Record<string, string> = {
  low: COLORS.tealDark,
  "low-medium": COLORS.warn,
  medium: COLORS.warn,
  high: COLORS.error,
};

export default function HistoryScreen() {
  const { t, lang } = useI18n();
  const [patients, setPatients] = useState<StoredPatient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<ClinicalEvent[]>([]);

  useEffect(() => {
    listPatients().then((p) => {
      setPatients(p);
      if (p.length > 0) setSelectedId((id) => id ?? p[0].patient.id);
    });
  }, []);

  const refresh = useCallback(() => {
    if (selectedId) listEvents(selectedId).then(setEvents);
  }, [selectedId]);

  useEffect(refresh, [refresh]);

  const selected = patients.find((p) => p.patient.id === selectedId);
  const nextSteps = deriveNextSteps(selected, events);
  const locale = lang === "es" ? "es-PE" : "en-US";

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <ScrollView style={styles.body}>
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
      </View>

      {selected && (
        <>
          {/* pending actions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.hist.nextSteps}</Text>
            {nextSteps.length === 0 && (
              <Text style={styles.emptyText}>{t.hist.allDone}</Text>
            )}
            {nextSteps.map((code) => (
              <View key={code} style={styles.stepRow}>
                <View style={styles.stepDot} />
                <Text style={styles.stepText}>{t.hist.steps[code]}</Text>
              </View>
            ))}
          </View>

          {/* timeline */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.hist.timeline}</Text>
            {events.length === 0 && (
              <Text style={styles.emptyText}>{t.hist.noEvents}</Text>
            )}
            {events.map((e, i) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={styles.eventRail}>
                  <View
                    style={[
                      styles.eventDot,
                      e.type === "assessment" && {
                        backgroundColor: RISK_COLORS[e.news2.risk] ?? COLORS.navy,
                      },
                    ]}
                  />
                  {i < events.length - 1 && <View style={styles.eventLine} />}
                </View>
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>
                    {e.type === "registration"
                      ? t.hist.registrationEvent
                      : t.hist.assessmentEvent(e.news2.total)}
                  </Text>
                  {e.type === "assessment" && (
                    <View style={styles.eventMetaRow}>
                      <View
                        style={[
                          styles.riskChip,
                          { backgroundColor: RISK_COLORS[e.news2.risk] ?? COLORS.navy },
                        ]}
                      >
                        <Text style={styles.riskChipText}>{t.mon.risk[e.news2.risk]}</Text>
                      </View>
                      <Text style={styles.eventMeta}>
                        SpO₂ {e.vitals.spo2}% · {e.vitals.pulse} bpm ·{" "}
                        {e.vitals.systolicBP} mmHg
                      </Text>
                    </View>
                  )}
                  <Text style={styles.eventTime}>{formatTime(e.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.navy, marginBottom: 12 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.teal,
  },
  stepText: { fontSize: 14, color: COLORS.ink, flex: 1 },
  eventRow: { flexDirection: "row", gap: 12 },
  eventRail: { alignItems: "center", width: 14 },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.navy,
    marginTop: 3,
  },
  eventLine: { flex: 1, width: 2, backgroundColor: COLORS.line, marginVertical: 2 },
  eventBody: { flex: 1, paddingBottom: 16 },
  eventTitle: { fontSize: 14, fontWeight: "600", color: COLORS.ink },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  riskChip: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  riskChipText: { color: "#fff", fontSize: 10.5, fontWeight: "700" },
  eventMeta: { fontSize: 12.5, color: COLORS.muted },
  eventTime: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
});
