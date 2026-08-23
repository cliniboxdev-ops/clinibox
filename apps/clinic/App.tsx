import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import CriticalAlertOverlay from "./src/components/CriticalAlertOverlay";
import { I18nProvider, useI18n, type Lang } from "./src/i18n";
import HistoryScreen from "./src/screens/HistoryScreen";
import MonitorScreen from "./src/screens/MonitorScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { COLORS } from "./src/theme";
import { VitalsProvider } from "./src/vitals-context";

type Tab = "pacientes" | "monitor" | "historial";

export default function App() {
  return (
    <I18nProvider>
      <VitalsProvider>
        <Shell />
        <CriticalAlertOverlay />
      </VitalsProvider>
    </I18nProvider>
  );
}

function Shell() {
  const { t, lang, setLang } = useI18n();
  const [tab, setTab] = useState<Tab>("pacientes");

  const tabs: { id: Tab; label: string }[] = [
    { id: "pacientes", label: t.tabs.patients },
    { id: "monitor", label: t.tabs.monitor },
    { id: "historial", label: t.tabs.history },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.logo}>
            <Text style={{ color: "#fff" }}>Clini</Text>
            <Text style={{ color: COLORS.teal }}>box</Text>
          </Text>
          <View style={styles.langRow}>
            {(["en", "es"] as Lang[]).map((l) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                style={[styles.langBtn, lang === l && styles.langBtnActive]}
              >
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                  {l.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.tabRow}>
          {tabs.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={[styles.tab, tab === item.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {tab === "pacientes" && <RegisterScreen />}
      {tab === "monitor" && <MonitorScreen />}
      {tab === "historial" && <HistoryScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.navy,
    paddingTop: 48,
    paddingBottom: 0,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { fontSize: 26, fontWeight: "700" },
  langRow: { flexDirection: "row", gap: 6 },
  langBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  langBtnActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  langText: { color: "#cfe3f5", fontSize: 12, fontWeight: "700" },
  langTextActive: { color: "#fff" },
  tabRow: { flexDirection: "row", gap: 6, marginTop: 14 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  tabActive: { backgroundColor: COLORS.bg },
  tabText: { color: "#cfe3f5", fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: COLORS.navy, fontWeight: "700" },
});
