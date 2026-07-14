import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getWatchTogether } from "../../src/services/watchTogether";
import { getHiddenKeys, hideRec } from "../../src/services/hiddenRecs";
import { filterByGenre, pickHero } from "../../src/lib/watchTogetherLogic";
import { GENRES } from "../../src/lib/genres";
import { PosterImage } from "../../src/components/PosterImage";
import { TitleRow } from "../../src/components/TitleRow";
import { useI18n } from "../../src/i18n/I18nProvider";
import type { MediaType } from "../../src/types/tmdb";

type HeroItem = { tmdbId: number; mediaType: MediaType; title: string; posterPath: string | null };

export default function WatchTogetherResultsScreen() {
  const { group } = useLocalSearchParams<{ group: string }>();
  const friendIds = (group ?? "").split(",").filter(Boolean);
  const groupSize = friendIds.length + 1; // +1 for me
  const router = useRouter();
  const { t } = useI18n();
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [shuffle, setShuffle] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["watch-together", friendIds.join(",")],
    queryFn: () => getWatchTogether(friendIds),
  });

  const qc = useQueryClient();
  const hidden = useQuery({ queryKey: ["hidden-recs"], queryFn: getHiddenKeys });
  const hiddenSet = hidden.data ?? new Set<string>();
  // "Not interested": hide instantly, persist, and refetch so the group picks
  // re-learn (the dismissed title's genres now count against future suggestions).
  const hide = useMutation({
    mutationFn: (s: { tmdbId: number; mediaType: MediaType }) => hideRec(s),
    onMutate: async (s) => {
      const key = `${s.mediaType}:${s.tmdbId}`;
      await qc.cancelQueries({ queryKey: ["hidden-recs"] });
      const prev = qc.getQueryData<Set<string>>(["hidden-recs"]);
      qc.setQueryData<Set<string>>(["hidden-recs"], new Set([...(prev ?? []), key]));
      return { prev };
    },
    onError: (_e, _s, ctx) => {
      if (ctx?.prev) qc.setQueryData(["hidden-recs"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["watch-together"] }),
  });

  function toggleGenre(ids: number[]) {
    // a chip toggles its whole id-set; treat the first id as the chip identity
    const head = ids[0];
    setGenreIds((cur) => (cur.includes(head) ? cur.filter((x) => !ids.includes(x)) : [...cur, ...ids]));
    setShuffle(0);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ headerShown: true, title: t("wt.resultsTitle") }} />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : isError || !data ? (
        <Text style={styles.msg}>{t("wt.cantLoad")}</Text>
      ) : (
        (() => {
          // Only MUTUAL wants (2+ people want it) lead the result — a single
          // person's want no longer drives "what should we watch". When the group
          // shares no wants, we fall back to history-based suggestions.
          const sharedPicks = data.picks.filter((p) => p.wantedBy >= 2);
          const suggestions = filterByGenre(data.suggestions, genreIds).filter(
            (s) => !hiddenSet.has(`${s.mediaType}:${s.tmdbId}`)
          );

          const sharedHero: HeroItem[] = sharedPicks.map((p) => ({
            tmdbId: p.entry.tmdb_id,
            mediaType: p.entry.media_type,
            title: p.entry.title,
            posterPath: p.entry.poster_path,
          }));
          const suggHero: HeroItem[] = suggestions.map((s) => ({
            tmdbId: s.tmdbId,
            mediaType: s.mediaType,
            title: s.title,
            posterPath: s.posterPath,
          }));
          const heroPool = sharedHero.length > 0 ? sharedHero : suggHero;
          const hero = pickHero(heroPool, shuffle);

          const open = (mt: MediaType, id: number) => router.push(`/title/${mt}/${id}`);

          return (
            <>
              {/* Genre chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}
              >
                {GENRES.map((g) => {
                  const on = g.ids.some((id) => genreIds.includes(id));
                  return (
                    <Pressable
                      key={g.label}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => toggleGenre(g.ids)}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{g.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Hero */}
              {hero ? (
                <View style={styles.heroCard}>
                  <Text style={styles.heroLabel}>{t("wt.tonightsPick")}</Text>
                  <Pressable style={styles.heroBody} onPress={() => open(hero.mediaType, hero.tmdbId)}>
                    <PosterImage path={hero.posterPath} width={92} height={138} radius={10} />
                    <View style={styles.heroMeta}>
                      <Text style={styles.heroTitle}>{hero.title}</Text>
                      <Text style={styles.heroType}>{hero.mediaType === "movie" ? t("media.movie") : t("media.tv")}</Text>
                    </View>
                  </Pressable>
                  {heroPool.length > 1 ? (
                    <Pressable style={styles.shuffleBtn} onPress={() => setShuffle((n) => n + 1)}>
                      <Text style={styles.shuffleText}>⇄ {t("wt.shuffle")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/* Mutual wishlist picks (2+ people want it) */}
              {sharedPicks.length > 0 ? (
                <>
                  <Text style={styles.section}>{t("wt.upNext")}</Text>
                  {sharedPicks.map((p) => {
                    const e = p.entry;
                    const everyone = p.wantedBy >= groupSize && groupSize > 1;
                    const tag = everyone
                      ? t("wt.everyoneWants")
                      : `🔥 ${p.wantedBy} ${t("wt.wantThis")}`;
                    return (
                      <TitleRow
                        key={`${e.media_type}:${e.tmdb_id}`}
                        title={e.title}
                        mediaType={e.media_type}
                        posterPath={e.poster_path}
                        subtitle={tag}
                        onPress={() => open(e.media_type, e.tmdb_id)}
                      />
                    );
                  })}
                </>
              ) : null}

              {/* Suggestions from history */}
              <Text style={styles.section}>{t("wt.becauseWatching")}</Text>
              {suggestions.length === 0 ? (
                <Text style={styles.msg}>
                  {sharedPicks.length === 0 ? t("wt.noWishlistPicks") : t("wt.noGenreMatch")}
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggRow}>
                  {suggestions.map((s) => (
                    <View key={`${s.mediaType}:${s.tmdbId}`} style={styles.sugg}>
                      <View>
                        <Pressable onPress={() => open(s.mediaType, s.tmdbId)}>
                          <PosterImage path={s.posterPath} width={104} height={156} radius={10} />
                        </Pressable>
                        <Pressable
                          style={styles.hideBtn}
                          hitSlop={8}
                          onPress={() => hide.mutate({ tmdbId: s.tmdbId, mediaType: s.mediaType })}
                          accessibilityLabel="Not interested"
                        >
                          <Ionicons name="close" size={13} color="#fff" />
                        </Pressable>
                      </View>
                      <Pressable onPress={() => open(s.mediaType, s.tmdbId)}>
                        <Text style={styles.suggTitle} numberOfLines={2}>
                          {s.title}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </>
          );
        })()
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chipScroll: { flexGrow: 0, marginBottom: 16 },
  chipRow: { gap: 8, paddingRight: 8, alignItems: "center" },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: "#b9553c" },
  chipText: { fontSize: 13, lineHeight: 18, color: "#666", fontWeight: "600" },
  chipTextOn: { color: "#fff" },

  heroCard: { borderWidth: 1.5, borderColor: "#f5ede7", backgroundColor: "#f7f8ff", borderRadius: 16, padding: 14, marginBottom: 8 },
  heroLabel: { fontSize: 10, fontWeight: "800", color: "#b9553c", letterSpacing: 1, marginBottom: 10 },
  heroBody: { flexDirection: "row", gap: 14, alignItems: "center" },
  heroMeta: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontWeight: "700" },
  heroType: { fontSize: 12, color: "#888", marginTop: 4 },
  shuffleBtn: { alignSelf: "flex-start", marginTop: 12, backgroundColor: "#b9553c", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  shuffleText: { color: "#fff", fontWeight: "700", fontSize: 13, lineHeight: 17 },

  section: { fontSize: 13, fontWeight: "700", color: "#888", marginTop: 22, marginBottom: 10 },
  suggRow: { gap: 12, paddingBottom: 8, paddingRight: 8 },
  sugg: { width: 104 },
  suggTitle: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  hideBtn: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  msg: { color: "#888", fontSize: 13, marginTop: 8, lineHeight: 19 },
});
