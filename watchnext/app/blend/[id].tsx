import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Share } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../src/services/supabase";
import { getBlend } from "../../src/services/blend";
import { PosterImage } from "../../src/components/PosterImage";
import { useI18n } from "../../src/i18n/I18nProvider";
import { matchColor } from "../../src/lib/avatar";
import { fullName, type Profile } from "../../src/types/db";

type Poster = { tmdbId: number; mediaType: "movie" | "tv"; title: string; posterPath: string | null };

export default function BlendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const profile = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      return (data as Profile) ?? null;
    },
  });
  const blend = useQuery({ queryKey: ["blend", id], queryFn: () => getBlend(id) });

  const name = profile.data ? fullName(profile.data) || `@${profile.data.username}` : "";
  const score = blend.data?.match.score ?? null;

  // Tonight's pick: a mutual want first, else the top blend recommendation.
  const mutual = blend.data?.mutual ?? [];
  const feed = blend.data?.feed ?? [];
  const tonight: Poster | null = mutual[0]
    ? { tmdbId: mutual[0].entry.tmdb_id, mediaType: mutual[0].entry.media_type, title: mutual[0].entry.title, posterPath: mutual[0].entry.poster_path }
    : feed[0]
    ? { tmdbId: feed[0].tmdbId, mediaType: feed[0].mediaType, title: feed[0].title, posterPath: feed[0].posterPath }
    : null;

  const favorites = blend.data?.match.sharedFavorites ?? [];
  const open = (mt: "movie" | "tv", tid: number) => router.push(`/title/${mt}/${tid}`);

  function share() {
    const msg = t("blend.shareMsg")
      .replace("{name}", name)
      .replace("{pct}", String(score ?? 0));
    Share.share({ message: msg }).catch(() => {});
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ headerShown: true, title: t("blend.title") }} />

      {blend.isLoading || profile.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : blend.isError ? (
        <View style={styles.errBox}>
          <Text style={styles.errEmoji}>📡</Text>
          <Text style={styles.errText}>{t("add.errorHint")}</Text>
          <Pressable style={styles.errBtn} onPress={() => blend.refetch()}>
            <Text style={styles.errBtnText}>{t("add.tryAgain")}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Shareable match card */}
          <View style={[styles.card, { backgroundColor: score != null ? matchColor(score) : "#8e9bd9" }]}>
            <Text style={styles.cardEmoji}>🍿</Text>
            <Text style={styles.cardNames} numberOfLines={1}>{name}</Text>
            {score != null ? (
              <>
                <Text style={styles.cardPct}>{score}%</Text>
                <Text style={styles.cardMatched}>{t("blend.matched")}</Text>
                <Text style={styles.cardStat}>{blend.data?.match.coWatched ?? 0} {t("blend.inCommon")}</Text>
              </>
            ) : (
              <Text style={styles.cardNotEnough}>{t("blend.notEnough")}</Text>
            )}

            {tonight ? (
              <View style={styles.tonight}>
                <Text style={styles.tonightLabel}>{t("blend.tonightsPick")}</Text>
                <Pressable style={styles.tonightBody} onPress={() => open(tonight.mediaType, tonight.tmdbId)}>
                  <PosterImage path={tonight.posterPath} width={56} height={84} radius={8} />
                  <Text style={styles.tonightTitle} numberOfLines={2}>{tonight.title}</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable style={styles.shareBtn} onPress={share}>
              <Text style={styles.shareBtnText}>{t("blend.share")}</Text>
            </Pressable>
          </View>

          {/* You both love */}
          {favorites.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("taste.bothLove")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {favorites.map((e) => (
                  <Pressable key={`${e.media_type}:${e.tmdb_id}`} onPress={() => open(e.media_type, e.tmdb_id)}>
                    <PosterImage path={e.poster_path} width={92} height={138} radius={10} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* The blend feed */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("blend.picks")}</Text>
            {feed.length === 0 ? (
              <Text style={styles.empty}>{t("blend.noFeed")}</Text>
            ) : (
              <View style={styles.grid}>
                {feed.map((s) => (
                  <Pressable key={`${s.mediaType}:${s.tmdbId}`} style={styles.gridItem} onPress={() => open(s.mediaType, s.tmdbId)}>
                    <PosterImage path={s.posterPath} width={104} height={156} radius={10} />
                    <Text style={styles.gridTitle} numberOfLines={2}>{s.title}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  errBox: { alignItems: "center", marginTop: 48, paddingHorizontal: 24 },
  errEmoji: { fontSize: 40, marginBottom: 12 },
  errText: { color: "#888", fontSize: 14, textAlign: "center", lineHeight: 20 },
  errBtn: { backgroundColor: "#b9553c", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
  errBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: { borderRadius: 22, padding: 22, alignItems: "center" },
  cardEmoji: { fontSize: 34 },
  cardNames: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 6, maxWidth: "100%" },
  cardPct: { color: "#fff", fontSize: 64, fontWeight: "900", marginTop: 8, letterSpacing: -2 },
  cardMatched: { color: "#fff", fontSize: 14, fontWeight: "700", opacity: 0.95, marginTop: -6 },
  cardStat: { color: "#fff", fontSize: 13, fontWeight: "600", opacity: 0.9, marginTop: 10 },
  cardNotEnough: { color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: 14, lineHeight: 20, opacity: 0.95 },

  tonight: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 14, padding: 12, marginTop: 18, alignSelf: "stretch" },
  tonightLabel: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 8, opacity: 0.9 },
  tonightBody: { flexDirection: "row", gap: 12, alignItems: "center" },
  tonightTitle: { color: "#fff", fontSize: 15, fontWeight: "700", flex: 1, minWidth: 0 },

  shareBtn: { backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 24, paddingVertical: 11, marginTop: 18 },
  shareBtnText: { color: "#111", fontWeight: "800", fontSize: 14 },

  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 10 },
  row: { gap: 10, paddingRight: 8 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridItem: { width: 104, marginBottom: 14 },
  gridTitle: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  empty: { color: "#888", fontSize: 13, lineHeight: 19 },
});
