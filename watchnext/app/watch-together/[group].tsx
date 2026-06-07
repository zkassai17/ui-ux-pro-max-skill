import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { getWatchTogether } from "../../src/services/watchTogether";
import { filterByGenre, pickHero } from "../../src/lib/watchTogetherLogic";
import { GENRES } from "../../src/lib/genres";
import { PosterImage } from "../../src/components/PosterImage";
import { TitleRow } from "../../src/components/TitleRow";
import type { MediaType } from "../../src/types/tmdb";

type HeroItem = { tmdbId: number; mediaType: MediaType; title: string; posterPath: string | null };

export default function WatchTogetherResultsScreen() {
  const { group } = useLocalSearchParams<{ group: string }>();
  const friendIds = (group ?? "").split(",").filter(Boolean);
  const router = useRouter();
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [shuffle, setShuffle] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["watch-together", friendIds.join(",")],
    queryFn: () => getWatchTogether(friendIds),
  });

  function toggleGenre(ids: number[]) {
    // a chip toggles its whole id-set; treat the first id as the chip identity
    const head = ids[0];
    setGenreIds((cur) => (cur.includes(head) ? cur.filter((x) => !ids.includes(x)) : [...cur, ...ids]));
    setShuffle(0);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ headerShown: true, title: "What to watch" }} />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : isError || !data ? (
        <Text style={styles.msg}>Couldn't load picks. Go back and try again.</Text>
      ) : (
        (() => {
          const shared = data.shared;
          const suggestions = filterByGenre(data.suggestions, genreIds);

          const sharedHero: HeroItem[] = shared.map((e) => ({
            tmdbId: e.tmdb_id,
            mediaType: e.media_type,
            title: e.title,
            posterPath: e.poster_path,
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
                  <Text style={styles.heroLabel}>TONIGHT'S PICK</Text>
                  <Pressable style={styles.heroBody} onPress={() => open(hero.mediaType, hero.tmdbId)}>
                    <PosterImage path={hero.posterPath} width={92} height={138} radius={10} />
                    <View style={styles.heroMeta}>
                      <Text style={styles.heroTitle}>{hero.title}</Text>
                      <Text style={styles.heroType}>{hero.mediaType === "movie" ? "Movie" : "TV"}</Text>
                    </View>
                  </Pressable>
                  {heroPool.length > 1 ? (
                    <Pressable style={styles.shuffleBtn} onPress={() => setShuffle((n) => n + 1)}>
                      <Text style={styles.shuffleText}>⇄ Shuffle</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/* Shared want-to-watch */}
              {shared.length > 0 ? (
                <>
                  <Text style={styles.section}>You all want to watch</Text>
                  {shared.map((e) => (
                    <TitleRow
                      key={`${e.media_type}:${e.tmdb_id}`}
                      title={e.title}
                      mediaType={e.media_type}
                      posterPath={e.poster_path}
                      onPress={() => open(e.media_type, e.tmdb_id)}
                    />
                  ))}
                </>
              ) : null}

              {/* Suggestions from history */}
              <Text style={styles.section}>Because you've all been watching</Text>
              {suggestions.length === 0 ? (
                <Text style={styles.msg}>
                  {shared.length === 0
                    ? "No shared picks yet — add more titles to your want lists to get matches."
                    : "No suggestions match that genre. Try clearing a filter."}
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggRow}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={`${s.mediaType}:${s.tmdbId}`}
                      style={styles.sugg}
                      onPress={() => open(s.mediaType, s.tmdbId)}
                    >
                      <PosterImage path={s.posterPath} width={104} height={156} radius={10} />
                      <Text style={styles.suggTitle} numberOfLines={2}>
                        {s.title}
                      </Text>
                    </Pressable>
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
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 13, lineHeight: 18, color: "#666", fontWeight: "600" },
  chipTextOn: { color: "#fff" },

  heroCard: { borderWidth: 1.5, borderColor: "#eef0ff", backgroundColor: "#f7f8ff", borderRadius: 16, padding: 14, marginBottom: 8 },
  heroLabel: { fontSize: 10, fontWeight: "800", color: "#5b6cff", letterSpacing: 1, marginBottom: 10 },
  heroBody: { flexDirection: "row", gap: 14, alignItems: "center" },
  heroMeta: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontWeight: "700" },
  heroType: { fontSize: 12, color: "#888", marginTop: 4 },
  shuffleBtn: { alignSelf: "flex-start", marginTop: 12, backgroundColor: "#5b6cff", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  shuffleText: { color: "#fff", fontWeight: "700", fontSize: 13, lineHeight: 17 },

  section: { fontSize: 13, fontWeight: "700", color: "#888", marginTop: 22, marginBottom: 10 },
  suggRow: { gap: 12, paddingBottom: 8, paddingRight: 8 },
  sugg: { width: 104 },
  suggTitle: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  msg: { color: "#888", fontSize: 13, marginTop: 8, lineHeight: 19 },
});
