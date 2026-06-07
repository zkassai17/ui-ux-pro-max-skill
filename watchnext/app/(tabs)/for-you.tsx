import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getFeed } from "../../src/services/feed";
import { PosterImage } from "../../src/components/PosterImage";

const WATCH_VERB: Record<string, string> = {
  watched: "finished watching",
  watching: "is watching",
  want: "wants to watch",
};

export default function FeedScreen() {
  const { data, isLoading } = useQuery({ queryKey: ["feed"], queryFn: getFeed });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={data ?? []}
      keyExtractor={(r) => r.item.id}
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
