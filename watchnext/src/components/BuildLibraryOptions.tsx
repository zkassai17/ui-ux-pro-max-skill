import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n/I18nProvider";
import { ACCENT } from "../theme";

// The two fast ways to bulk-add your watch history. Surfaced on the empty
// Library and as its own screen so new users always see the easy paths.
const OPTIONS = [
  { key: "import", icon: "cloud-upload-outline" as const, route: "/import" as const },
  { key: "tap", icon: "apps-outline" as const, route: "/quick-seen" as const },
];

export function BuildLibraryOptions() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((o) => (
        <Pressable key={o.key} style={styles.card} onPress={() => router.push(o.route)}>
          <View style={styles.iconWrap}>
            <Ionicons name={o.icon} size={22} color={ACCENT} />
          </View>
          <View style={styles.meta}>
            <Text style={styles.title}>{t(`build.${o.key}`)}</Text>
            <Text style={styles.sub}>{t(`build.${o.key}Sub`)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#c4c4cc" />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch", gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#f7f7f9",
    borderRadius: 16,
    padding: 16,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#eef0ff", alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "800", color: "#111" },
  sub: { fontSize: 12, color: "#888", marginTop: 3, lineHeight: 16 },
});
