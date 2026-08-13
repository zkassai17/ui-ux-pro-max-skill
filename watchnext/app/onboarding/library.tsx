import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BuildLibraryOptions } from "../../src/components/BuildLibraryOptions";
import { useI18n } from "../../src/i18n/I18nProvider";
import { HEADING } from "../../src/theme";

// Cold start: a brand-new account has an empty library, so recommendations,
// Tonight's pick and Blends have nothing to work with. Offer both fast paths to
// a real library (import a history, or tap what you've seen) instead of forcing
// one — importing is far quicker for anyone with a streaming history.
export default function OnboardingLibrary() {
  const { t } = useI18n();
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <Text style={styles.title}>{t("build.heading")}</Text>
        <Text style={styles.sub}>{t("build.onboardingSub")}</Text>

        <View style={styles.options}>
          <BuildLibraryOptions from="onboarding" />
        </View>

        <Pressable style={styles.skip} onPress={() => router.replace("/(tabs)/for-you")} hitSlop={8}>
          <Text style={styles.skipText}>{t("build.skip")}</Text>
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
  options: { marginTop: 28 },
  skip: { alignItems: "center", paddingVertical: 16, marginTop: 18 },
  skipText: { fontSize: 14, fontWeight: "700", color: "#999" },
});
