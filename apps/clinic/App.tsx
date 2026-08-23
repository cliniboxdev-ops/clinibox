import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MonitorScreen from "./src/screens/MonitorScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { COLORS } from "./src/theme";

type Tab = "pacientes" | "monitor";

const TABS: { id: Tab; label: string }[] = [
  { id: "pacientes", label: "Pacientes" },
  { id: "monitor", label: "Monitor" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("pacientes");

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.logo}>
          <Text style={{ color: "#fff" }}>Clini</Text>
          <Text style={{ color: COLORS.teal }}>box</Text>
        </Text>
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tab, tab === t.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {tab === "pacientes" ? <RegisterScreen /> : <MonitorScreen />}
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
  logo: { fontSize: 26, fontWeight: "700" },
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
