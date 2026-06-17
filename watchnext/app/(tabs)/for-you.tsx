import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getFeed } from "../../src/services/feed";
import { getLibrary } from "../../src/services/watchlist";
import { getForYou } from "../../src/services/forYou";
import { titleKey } from "../../src/lib/forYouLogic";
import { PosterImage } from "../../src/components/PosterImage";
import { QuickAddButton } from "../../src/components/QuickAddButton";
import { CDrawLoader } from "../../src/components/CDrawLoader";
import type { Title, MediaType } from "../../src/types/tmdb";

const WATCH_VERB: Record<string, string> = {
  watched: "finished watching",
  watching: "is watching",
  want: "wants to watch",
};

function WatchTogetherCard() {
  const router = useRouter();
  return (
    <Pressable style={styles.wtCard} onPress={() => router.push("/watch-together")}>
      <Text style={styles.wtTitle}>What should we watch?</Text>
      <Text style={styles.wtSub}>Find something you and your friends both want to see →</Text>
    </Pressable>
  );
}

function ForYouRail({ mediaType, heading }: { mediaType: MediaType; heading: string }) {
  const router = useRouter();
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });

  const entries = library.data ?? [];
  const excludeKeys = new Set(entries.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })));
  // Re-derive whenever the library changes (status/rating included) so recs stay fresh.
  const libHash = entries
    .map((e) => `${e.media_type}:${e.tmdb_id}:${e.status}:${e.rating ?? ""}`)
    .join("|");

  const recs = useQuery({
    queryKey: ["for-you", mediaType, libHash],
    enabled: !library.isLoading,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getForYou(mediaType, entries),
  });

  // Re-filter on every render so a title you just added drops out instantly —
  // before the query has a chance to refetch.
  const titles = (recs.data ?? []).filter((t) => !excludeKeys.has(titleKey(t)));

  if (recs.isLoading || library.isLoading) {
    return (
      <View style={styles.rail}>
        <Text style={styles.sectionHeading}>{heading}</Text>
        <ActivityIndicator style={{ marginVertical: 16 }} />
      </View>
    );
  }
  if (titles.length === 0) return null;

  return (
    <View style={styles.rail}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railRow}>
        {titles.map((t: Title) => (
          <View key={`${t.mediaType}:${t.tmdbId}`} style={styles.suggestion}>
            <Pressable onPress={() => router.push(`/title/${t.mediaType}/${t.tmdbId}`)}>
              <View>
                <PosterImage path={t.posterPath} width={104} height={156} radius={10} />
                <View style={styles.posterAdd}>
                  <QuickAddButton title={t} compact />
                </View>
              </View>
              <Text style={styles.suggestionTitle} numberOfLines={2}>
                {t.title}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["feed"], queryFn: getFeed });
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["feed"] }),
      qc.invalidateQueries({ queryKey: ["library"] }),
      qc.invalidateQueries({ queryKey: ["for-you"] }),
      qc.invalidateQueries({ queryKey: ["trending"] }),
      qc.invalidateQueries({ queryKey: ["incoming-requests"] }),
      qc.invalidateQueries({ queryKey: ["received-recs"] }),
    ]);
    setRefreshing(false);
  }

  // Branded "c drawing itself" loader — appears only once the feed has been
  // loading long enough to warrant it, so fast loads don't flash it.
  if (isLoading) return <CDrawLoader delay={450} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={data ?? []}
      keyExtractor={(r) => r.item.id}
      ListHeaderComponent={
        <View>
          <WatchTogetherCard />
          <ForYouRail mediaType="movie" heading="Movies for you" />
          <ForYouRail mediaType="tv" heading="Shows for you" />
          <Text style={styles.sectionHeading}>Activity</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.msg}>
          No activity yet. Add friends and they’ll show up here as they watch and recommend.
        </Text>
      }
      renderItem={({ item: row }) => {
        const name = row.username ? `@${row.username}` : "A friend";
        if (row.item.kind === "watchlist") {
          const e = row.item.entry;
          return (
            <View style={styles.card}>
              <Text style={styles.head}>
                <Text style={styles.name}>{name}</Text> {WATCH_VERB[e.status]}
              </Text>
              <View style={styles.row}>
                <PosterImage path={e.poster_path} width={42} height={62} />
                <View style={styles.meta}>
                  <Text style={styles.title}>{e.title}</Text>
                  <Text style={styles.pill}>{e.media_type === "movie" ? "MOVIE" : "TV"}</Text>
                </View>
              </View>
            </View>
          );
        }
        const rec = row.item.rec;
        return (
          <View style={styles.card}>
            <Text style={styles.head}>
              <Text style={styles.name}>{name}</Text> recommends
            </Text>
            <View style={styles.row}>
              <PosterImage path={rec.poster_path} width={42} height={62} />
              <View style={styles.meta}>
                <Text style={styles.title}>{rec.title}</Text>
                {rec.note ? <Text style={styles.note}>“{rec.note}”</Text> : null}
                <Text style={styles.pill}>{rec.media_type === "movie" ? "MOVIE" : "TV"}</Text>
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wtCard: { backgroundColor: "#5b6cff", borderRadius: 16, padding: 16, marginBottom: 18 },
  wtTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  wtSub: { color: "#dfe3ff", fontSize: 12, marginTop: 6, lineHeight: 17 },
  rail: { marginBottom: 8 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 10 },
  railRow: { gap: 12, paddingBottom: 4, paddingRight: 8 },
  suggestion: { width: 104 },
  suggestionTitle: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  posterAdd: { position: "absolute", top: 6, right: 6 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 10, marginBottom: 10 },
  head: { fontSize: 12, marginBottom: 8 },
  name: { fontWeight: "700" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "600" },
  note: { fontSize: 11, color: "#888", marginTop: 2 },
  pill: { alignSelf: "flex-start", marginTop: 4, fontSize: 9, color: "#5b6cff", backgroundColor: "#eef0ff", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: "hidden" },
  msg: { color: "#888", fontSize: 13, marginTop: 24, textAlign: "center" },
});
