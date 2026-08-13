import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StreamingPicker } from "../../src/components/StreamingPicker";
import { getStreamingServices, setStreamingServices } from "../../src/services/prefs";
import { useI18n } from "../../src/i18n/I18nProvider";
import { ACCENT, HEADING } from "../../src/theme";

// Optional onboarding step: which services do you subscribe to? Powers the Add
// tab's default filter (and, later, "only recommend what you can watch"). Fully
// skippable so it never blocks a new user.
export default function OnboardingServices() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    getStreamingServices().then(setSelected);
  }, []);

  function toggle(id: number) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function next() {
    await setStreamingServices(selected);
    router.replace("/onboarding/library");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <Text style={styles.title}>{t("streaming.onboardingTitle")}</Text>
        <Text style={styles.sub}>{t("streaming.onboardingSub")}</Text>

        <View style={styles.picker}>
          <StreamingPicker selected={selected} onToggle={toggle} />
        </View>

        <Pressable style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>
            {selected.length ? t("common.continue") : t("streaming.skip")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: { fontFamily: HEADING, fontSize: 26, color: "#111", textAlign: "center" },
  sub: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 8, lineHeight: 20 },
  picker: { marginTop: 28, alignItems: "center" },
  cta: { backgroundColor: ACCENT, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 32 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
