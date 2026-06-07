import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getLibrary } from "../../src/services/watchlist";
import { getRecommendations } from "../../src/services/tmdb";
import { rankRecommendations, titleKey } from "../../src/lib/forYouLogic";
import { TitleRow } from "../../src/components/TitleRow";

const MAX_SEEDS = 12;

export default function ForYouScreen() {
  const router = useRouter();
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });

  const entries = library.data ?? [];
  const seeds = entries.filter((e) => e.status === "watched").slice(0, MAX_SEEDS);
  const excludeKeys = new Set(entries.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })));
  const seedKey = seeds.map((s) => `${s.media_type}:${s.tmdb_id}`).join(",");

  const recs = useQuery({
    queryKey: ["for-you", seedKey],
    enabled: seeds.length > 0,
    queryFn: async () => {
      const lists = await Promise.all(seeds.map((s) => getRecommendations(s.media_type, s.tmdb_id)));
      return rankRecommendations(lists, excludeKeys);
    },
  });

  if (library.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (seeds.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.msg}>
          Mark a few titles as Watched and we'll suggest what to watch next based on them.
        </Text>
      </View>
    );
  }

  const rows = recs.data ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>Based on {seeds.length} title{seeds.length === 1 ? "" : "s"} you've watched</Text>
      {recs.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : recs.isError ? (
        <Text style={styles.msg}>{(recs.error as Error).message}</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.msg}>No fresh suggestions right now. Watch a few more titles and check back.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(t) => `${t.mediaType}:${t.tmdbId}`}
          renderItem={({ item }) => (
            <TitleRow
              title={item.title}
              subtitle={[item.year, item.rating ? `⭐ ${item.rating}` : null].filter(Boolean).join(" · ")}
              mediaType={item.mediaType}
              posterPath={item.posterPath}
              onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  intro: { fontSize: 12, color: "#888", marginBottom: 12 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center", lineHeight: 20 },
});
