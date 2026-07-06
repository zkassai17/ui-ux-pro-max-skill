import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Share } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getLibrary } from "../src/services/watchlist";
import { getYearInReview } from "../src/services/insights";
import { usePro } from "../src/pro/ProProvider";
import { useI18n } from "../src/i18n/I18nProvider";
import { PosterImage } from "../src/components/PosterImage";

const ACCENT = "#5b6cff";

export default function YearInWatchScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { isPro } = usePro();
  const year = new Date().getFullYear();
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const entries = library.data ?? [];
  const libHash = entries.map((e) => `${e.media_type}:${e.tmdb_id}:${e.status}`).join("|");
  const recap = useQuery({
    queryKey: ["year-in-watch", year, libHash],
    enabled: isPro && !library.isLoading,
    staleTime: 30 * 60 * 1000,
    queryFn: () => getYearInReview(entries, year),
  });

  if (!isPro) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: true, title: t("recap.title") }} />
        <View style={styles.lock}>
          <Text style={styles.lockEmoji}>🎞️</Text>
          <Text style={styles.lockTitle}>{t("recap.title")}</Text>
          <Text style={styles.lockBody}>{t("pro.feature.recap")}</Text>
          <Pressable style={styles.cta} onPress={() => router.replace("/paywall")}>
            <Text style={styles.ctaText}>{t("settings.getPro")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const d = recap.data;

  async function share() {
    if (!d) return;
    const parts = [
      `${t("recap.myYear")} ${year} ${t("recap.onWatchnext")}:`,
      `🎬 ${d.count} ${t("recap.titles")}`,
      d.topGenre ? `❤️ ${d.topGenre}` : null,
      d.top ? `⭐ ${t("recap.favorite")}: ${d.top.title}` : null,
    ].filter(Boolean);
    try {
      await Share.share({ message: parts.join("\n") });
    } catch {
      // dismissed
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ headerShown: true, title: t("recap.title") }} />

      {recap.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : !d || d.count === 0 ? (
        <View style={styles.lock}>
          <Text style={styles.lockEmoji}>🍿</Text>
          <Text style={styles.lockBody}>{t("recap.empty")}</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardYear}>{year}</Text>
            <Text style={styles.cardSub}>{t("recap.title")}</Text>

            <View style={styles.bigStat}>
              <Text style={styles.bigNum}>{d.count}</Text>
              <Text style={styles.bigLabel}>{t("recap.titlesWatched")}</Text>
            </View>

            <View style={styles.rowStats}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{d.movies}</Text>
                <Text style={styles.statLabel}>🎬 {t("media.movies")}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{d.tv}</Text>
                <Text style={styles.statLabel}>📺 {t("media.shows")}</Text>
              </View>
              {d.topGenre ? (
                <View style={styles.stat}>
                  <Text style={styles.statNumSm}>{d.topGenre}</Text>
                  <Text style={styles.statLabel}>❤️ {t("recap.topGenre")}</Text>
                </View>
              ) : null}
            </View>

            {d.top ? (
              <View style={styles.topPick}>
                <Text style={styles.topPickLabel}>⭐ {t("recap.favorite")}</Text>
                <Pressable
                  style={styles.topPickRow}
                  onPress={() => d.top && router.push(`/title/${d.top.media_type}/${d.top.tmdb_id}`)}
                >
                  <PosterImage path={d.top.poster_path} width={54} height={80} radius={8} />
                  <Text style={styles.topPickTitle} numberOfLines={2}>{d.top.title}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Pressable style={styles.cta} onPress={share}>
            <Text style={styles.ctaText}>{t("recap.share")}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  card: { backgroundColor: "#5b6cff", borderRadius: 22, padding: 24, alignItems: "center" },
  cardYear: { fontSize: 44, fontWeight: "900", color: "#fff" },
  cardSub: { fontSize: 13, fontWeight: "700", color: "#dfe3ff", marginTop: -4, letterSpacing: 0.5 },
  bigStat: { alignItems: "center", marginTop: 22 },
  bigNum: { fontSize: 54, fontWeight: "900", color: "#fff" },
  bigLabel: { fontSize: 13, fontWeight: "700", color: "#dfe3ff", marginTop: -6 },

  rowStats: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 20, marginTop: 22 },
  stat: { alignItems: "center", minWidth: 70 },
  statNum: { fontSize: 24, fontWeight: "900", color: "#fff" },
  statNumSm: { fontSize: 15, fontWeight: "900", color: "#fff", textAlign: "center" },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#c9cfff", marginTop: 3 },

  topPick: { alignSelf: "stretch", marginTop: 24, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 },
  topPickLabel: { fontSize: 12, fontWeight: "800", color: "#dfe3ff", marginBottom: 8 },
  topPickRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  topPickTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#fff" },

  cta: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  lock: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, marginTop: 40 },
  lockEmoji: { fontSize: 40, marginBottom: 10 },
  lockTitle: { fontSize: 20, fontWeight: "900", color: "#111" },
  lockBody: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 8, lineHeight: 20 },
});
