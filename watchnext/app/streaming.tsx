import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StreamingPicker } from "../src/components/StreamingPicker";
import { getStreamingServices, setStreamingServices } from "../src/services/prefs";
import { useI18n } from "../src/i18n/I18nProvider";

// Add/remove the streaming services you subscribe to. Saves on every toggle.
export default function StreamingSettings() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    getStreamingServices().then(setSelected);
  }, []);

  function toggle(id: number) {
    setSelected((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      setStreamingServices(next);
      return next;
    });
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: t("streaming.settingsTitle") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sub}>{t("streaming.settingsSub")}</Text>
        <StreamingPicker selected={selected} onToggle={toggle} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  sub: { fontSize: 14, color: "#777", lineHeight: 20, marginBottom: 20 },
});
