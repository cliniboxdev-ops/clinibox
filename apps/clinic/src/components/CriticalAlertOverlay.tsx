import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useI18n } from "../i18n";
import { useVitals } from "../vitals-context";
import { COLORS } from "../theme";

/**
 * Full-screen critical protocol overlay.
 *
 * Rendered above the tab navigator whenever the trigger engine is in a
 * critical state: interrupts whatever the user is doing, flashes the alarm
 * header, presents the stabilization checklist, and blocks the rest of the
 * app until every step is checked and the episode is marked handled.
 */
export default function CriticalAlertOverlay() {
  const { t } = useI18n();
  const { trigger, sample, resolveTrigger } = useVitals();
  const [done, setDone] = useState<boolean[]>([]);
  const flash = useRef(new Animated.Value(1)).current;

  const critical = trigger.state === "critical" ? trigger : null;

  useEffect(() => {
    if (!critical) return;
    setDone(new Array(t.alert.steps[critical.condition].length).fill(false));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flash, { toValue: 0.35, duration: 450, useNativeDriver: false }),
        Animated.timing(flash, { toValue: 1, duration: 450, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [critical?.condition, critical?.since]);

  if (!critical) return null;

  const steps = t.alert.steps[critical.condition];
  const allDone = done.length === steps.length && done.every(Boolean);

  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.banner, { opacity: flash }]}>
        <Text style={styles.bannerText}>
          ⚠ {t.alert.banner} — {t.alert.conditions[critical.condition]}
        </Text>
      </Animated.View>

      <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 20 }}>
        {sample && (
          <Text style={styles.vitalsLine}>
            SpO₂ {sample.spo2}% · {sample.pulse} bpm · {sample.systolicBP} mmHg ·{" "}
            {sample.respiratoryRate} rpm
          </Text>
        )}
        <Text style={styles.stepsTitle}>{t.alert.stepsTitle}</Text>
        {steps.map((step, i) => (
          <Pressable
            key={i}
            onPress={() =>
              setDone((d) => d.map((v, j) => (j === i ? !v : v)))
            }
            style={[styles.stepRow, done[i] && styles.stepRowDone]}
          >
            <View style={[styles.checkbox, done[i] && styles.checkboxDone]}>
              {done[i] && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.stepText, done[i] && styles.stepTextDone]}>
              {i + 1}. {step}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={allDone ? resolveTrigger : undefined}
          style={[styles.resolveBtn, !allDone && styles.resolveBtnDisabled]}
        >
          <Text style={styles.resolveBtnText}>
            {allDone ? t.alert.resolve : t.alert.resolveHint}
          </Text>
        </Pressable>
        <Text style={styles.lockNote}>{t.alert.lockNote}</Text>
        <Text style={styles.sourceNote}>{t.alert.sourceNote}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(18,20,24,0.96)",
    zIndex: 1000,
  },
  banner: {
    backgroundColor: COLORS.error,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  bannerText: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  sheet: { flex: 1 },
  vitalsLine: {
    color: "#ffb4a8",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
  },
  stepsTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  stepRowDone: { backgroundColor: "rgba(47,179,166,0.15)", borderColor: COLORS.teal },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  checkmark: { color: "#fff", fontWeight: "800" },
  stepText: { color: "#fff", fontSize: 15, flex: 1, lineHeight: 21 },
  stepTextDone: { color: "#9fe8df" },
  resolveBtn: {
    marginTop: 14,
    backgroundColor: COLORS.teal,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  resolveBtnDisabled: { backgroundColor: "rgba(255,255,255,0.15)" },
  resolveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  lockNote: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 12,
  },
  sourceNote: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11.5,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 30,
  },
});
