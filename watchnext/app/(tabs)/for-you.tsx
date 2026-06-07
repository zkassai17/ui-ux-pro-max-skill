import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getFeed } from "../../src/services/feed";
import { getLibrary } from "../../src/services/watchlist";
import { getRecommendations } from "../../src/services/tmdb";
import { rankRecommendations, titleKey } from "../../src/lib/forYouLogic";
import { PosterImage } from "../../src/components/PosterImage";
import type { Title, MediaType } from "../../src/types/tmdb";

const WATCH_VERB: Record<string, string> = {
  watched: "finished watching",
  watching: "is watching",
  want: "wants to watch",
};

const MAX_SEEDS = 12;
const MAX_SUGGESTIONS = 15;

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
  const seeds = entries
    .filter((e) => e.status === "watched" && e.media_type === mediaType)
    .slice(0, MAX_SEEDS);
  const excludeKeys = new Set(entries.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })));
  const seedKey = seeds.map((s) => `${s.media_type}:${s.tmdb_id}`).join(",");

  const recs = useQuery({
    queryKey: ["for-you", mediaType, seedKey],
    enabled: seeds.length > 0,
    queryFn: async () => {
      const lists = await Promise.all(seeds.map((s) => getRecommendations(s.media_type, s.tmdb_id)));
      return rankRecommendations(lists, excludeKeys).slice(0, MAX_SUGGESTIONS);
    },
  });

  if (seeds.length === 0) return null;

  const titles = recs.data ?? [];

  return (
    <View style={styles.rail}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {recs.isLoading ? (
        <ActivityIndicator style={{ marginVertical: 16 }} />
      ) : titles.length === 0 ? null : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railRow}>
          {titles.map((t: Title) => (
            <Pressable
              key={`${t.mediaType}:${t.tmdbId}`}
              style={styles.suggestion}
              onPress={() => router.push(`/title/${t.mediaType}/${t.tmdbId}`)}
            >
              <PosterImage path={t.posterPath} width={104} height={156} radius={10} />
              <Text style={styles.suggestionTitle} numberOfLines={2}>
                {t.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { data, isLoading } = useQuery({ queryKey: ["feed"], queryFn: getFeed });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
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
