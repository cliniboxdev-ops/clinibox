import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { analyzeTrend, type AssessmentPoint, type TrendDirection } from "@clinibox/protocol-engine";
import type { ClinicalEvent } from "../events";
import { useI18n } from "../i18n";
import { COLORS } from "../theme";

const DIRECTION_COLORS: Record<TrendDirection, string> = {
  improving: COLORS.tealDark,
  stable: COLORS.tealDark,
  worsening: COLORS.error,
  "insufficient-data": COLORS.muted,
};

/**
 * Trajectory over the patient's recorded assessments, with the disposition
 * actions that follow from it (discharge candidacy, transfer urgency).
 */
export default function TrendCard({ events }: { events: ClinicalEvent[] }) {
  const { t } = useI18n();

  const points: AssessmentPoint[] = useMemo(
    () =>
      events
        .filter((e): e is Extract<ClinicalEvent, { type: "assessment" }> =>
          e.type === "assessment",
        )
        .map((e) => ({
          timestamp: e.timestamp,
          news2Total: e.news2.total,
          risk: e.news2.risk,
          spo2: e.vitals.spo2,
          pulse: e.vitals.pulse,
          systolicBP: e.vitals.systolicBP,
          respiratoryRate: e.vitals.respiratoryRate,
        })),
    [events],
  );

  const trend = useMemo(() => analyzeTrend(points), [points]);
  const hasTrend = trend.direction !== "insufficient-data";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t.trend.title}</Text>
        <View style={[styles.badge, { backgroundColor: DIRECTION_COLORS[trend.direction] }]}>
          <Text style={styles.badgeText}>{t.trend.directions[trend.direction]}</Text>
        </View>
      </View>

      {hasTrend && (
        <>
          <Text style={styles.meta}>
            {t.trend.observed(trend.hoursObserved, trend.assessmentCount)}
          </Text>
          <Text style={styles.deltas}>
            {t.trend.deltas(trend.deltas.spo2, trend.deltas.pulse, trend.deltas.news2)}
          </Text>
        </>
      )}

      <View style={styles.actions}>
        {trend.actions.map((code) => (
          <View key={code} style={styles.actionRow}>
            <View
              style={[
                styles.actionDot,
                {
                  backgroundColor:
                    code === "escalate_immediate" || code === "escalate_transfer_24h"
                      ? COLORS.error
                      : code === "discharge_candidate_morning"
                        ? COLORS.tealDark
                        : COLORS.teal,
                },
              ]}
            />
            <Text style={styles.actionText}>{t.trend.actions[code]}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.advisory}>{t.trend.advisory}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.navy },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  meta: { fontSize: 12.5, color: COLORS.muted },
  deltas: { fontSize: 13.5, color: COLORS.ink, fontWeight: "600", marginTop: 4 },
  actions: { marginTop: 12, gap: 8 },
  actionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  actionDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  actionText: { fontSize: 14, color: COLORS.ink, flex: 1, lineHeight: 20 },
  advisory: { marginTop: 12, fontSize: 11.5, color: COLORS.muted, lineHeight: 16 },
});
