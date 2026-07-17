import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getLibrary } from "../src/services/watchlist";
import { getInsights } from "../src/services/insights";
import { usePro } from "../src/pro/ProProvider";
import { PRO_AVAILABLE } from "../src/lib/proGates";
import { useI18n } from "../src/i18n/I18nProvider";
import { ratingEmoji } from "../src/lib/ratingScale";

import { HEADING } from "../src/theme";
const ACCENT = "#5b6cff";

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(pct, 4)}%` }]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  // Explicit back so it always works, even if this screen was reached in a way
  // that leaves nothing to pop (falls back to the Profile tab).
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"));
  const headerBack = () => (
    <Pressable onPress={goBack} hitSlop={12} style={{ paddingHorizontal: 8 }}>
      <Ionicons name="chevron-back" size={26} color={ACCENT} />
    </Pressable>
  );
  const { isPro } = usePro();
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const entries = library.data ?? [];
  const libHash = entries.map((e) => `${e.media_type}:${e.tmdb_id}:${e.status}:${e.rating ?? ""}`).join("|");
  const insights = useQuery({
    queryKey: ["insights", libHash],
    enabled: isPro && !library.isLoading,
    staleTime: 30 * 60 * 1000,
    queryFn: () => getInsights(entries),
  });

  // Guard: Insights is a Pro feature. Non-Pro users get an upgrade prompt.
  if (!isPro) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: true, title: t("insights.title"), headerLeft: headerBack }} />
        <View style={styles.lock}>
          <Text style={styles.lockEmoji}>✦</Text>
          <Text style={styles.lockTitle}>{t("insights.title")}</Text>
          <Text style={styles.lockBody}>{t("pro.feature.insights")}</Text>
          {PRO_AVAILABLE ? (
            <Pressable style={styles.cta} onPress={() => router.replace("/paywall")}>
              <Text style={styles.ctaText}>{t("settings.getPro")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const data = insights.data;
  const genreMax = Math.max(1, ...(data?.genres.map((g) => g.count) ?? [1]));
  const decadeMax = Math.max(1, ...(data?.decades.map((d) => d.count) ?? [1]));
  const ratingMax = Math.max(1, ...(data?.ratings.map((r) => r.count) ?? [1]));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ headerShown: true, title: t("insights.title"), headerLeft: headerBack }} />

      {insights.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : !data ? (
        <Text style={styles.msg}>{t("insights.empty")}</Text>
      ) : (
        <>
          {/* Totals */}
          <View style={styles.totalsCard}>
            <Text style={styles.totalsBig}>{data.totals.total}</Text>
            <Text style={styles.totalsLabel}>{t("insights.titlesWatched")}</Text>
            <Text style={styles.totalsSplit}>
              🎬 {data.totals.movies} {t("media.movies")}  ·  📺 {data.totals.tv} {t("media.shows")}
            </Text>
          </View>

          {/* Genres */}
          {data.genres.length > 0 ? (
            <>
              <Text style={styles.section}>{t("insights.topGenres")}</Text>
              {data.genres.map((g) => (
                <Bar key={g.name} label={g.name} count={g.count} max={genreMax} />
              ))}
            </>
          ) : null}

          {/* Decades */}
          {data.decades.length > 0 ? (
            <>
              <Text style={styles.section}>{t("insights.decades")}</Text>
              {data.decades.map((d) => (
                <Bar key={d.decade} label={d.decade} count={d.count} max={decadeMax} />
              ))}
            </>
          ) : null}

          {/* Ratings */}
          <Text style={styles.section}>{t("insights.ratings")}</Text>
          {data.ratings.map((r) => (
            <Bar key={r.rating} label={ratingEmoji(r.rating) ?? `${r.rating}★`} count={r.count} max={ratingMax} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  msg: { color: "#888", fontSize: 13, marginTop: 24, textAlign: "center" },

  totalsCard: { backgroundColor: "#f3f4ff", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 8 },
  totalsBig: { fontFamily: HEADING, fontSize: 42, fontWeight: "900", color: ACCENT },
  totalsLabel: { fontSize: 13, fontWeight: "700", color: "#7a82c0", marginTop: -4 },
  totalsSplit: { fontSize: 13, color: "#555", fontWeight: "600", marginTop: 10 },

  section: { fontSize: 13, fontWeight: "800", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 24, marginBottom: 10 },

  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  barLabel: { width: 74, fontSize: 13, fontWeight: "600", color: "#333" },
  barTrack: { flex: 1, height: 14, backgroundColor: "#eee", borderRadius: 7, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: ACCENT, borderRadius: 7 },
  barCount: { width: 28, textAlign: "right", fontSize: 12, fontWeight: "700", color: "#888" },

  lock: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  lockEmoji: { fontSize: 40, color: ACCENT, marginBottom: 10 },
  lockTitle: { fontFamily: HEADING, fontSize: 20, fontWeight: "900", color: "#111" },
  lockBody: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 8, lineHeight: 20 },
  cta: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 20 },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
