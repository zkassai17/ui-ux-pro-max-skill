import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReceived, acceptRecommendation, dismissRecommendation } from "../../src/services/recommendations";
import { PosterImage } from "../../src/components/PosterImage";

export default function RecsScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["received-recs"], queryFn: getReceived });

  async function act(fn: () => Promise<void>) {
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["received-recs"] });
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      Alert.alert("Action failed", (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.rec.id}
          ListEmptyComponent={
            <Text style={styles.msg}>No recommendations yet. When a friend sends you one, it shows up here.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <PosterImage path={item.rec.poster_path} width={46} height={68} />
                <View style={styles.meta}>
                  <Text style={styles.title}>{item.rec.title}</Text>
                  <Text style={styles.sub}>
                    from @{item.from?.username ?? "a friend"} · {item.rec.media_type === "movie" ? "MOVIE" : "TV"}
                  </Text>
                </View>
              </View>
              {item.rec.note ? <Text style={styles.note}>“{item.rec.note}”</Text> : null}
              <View style={styles.btnRow}>
                <Pressable style={styles.accept} onPress={() => act(() => acceptRecommendation(item.rec))}>
                  <Text style={styles.acceptText}>Add to Want</Text>
                </Pressable>
                <Pressable style={styles.dismiss} onPress={() => act(() => dismissRecommendation(item.rec.id))}>
                  <Text style={styles.dismissText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12, marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, color: "#888", marginTop: 2 },
  note: { backgroundColor: "#f0f0f3", borderRadius: 10, padding: 10, fontSize: 12, color: "#555", marginTop: 8 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  accept: { flex: 1, backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  acceptText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  dismiss: { flex: 1, backgroundColor: "#f0f0f3", borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  dismissText: { color: "#333", fontWeight: "600", fontSize: 13 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
