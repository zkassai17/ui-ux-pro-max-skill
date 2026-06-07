import { View, Text, Pressable, SectionList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getIncomingRequests, acceptRequest, declineRequest } from "../src/services/friends";
import { getReceived, acceptRecommendation, dismissRecommendation } from "../src/services/recommendations";
import { PosterImage } from "../src/components/PosterImage";
import type { IncomingRequest } from "../src/services/friends";
import type { ReceivedRec } from "../src/services/recommendations";

type RequestItem = { kind: "request"; data: IncomingRequest };
type RecItem = { kind: "rec"; data: ReceivedRec };
type InboxItem = RequestItem | RecItem;

export default function InboxScreen() {
  const qc = useQueryClient();
  const requests = useQuery({ queryKey: ["incoming-requests"], queryFn: getIncomingRequests });
  const recs = useQuery({ queryKey: ["received-recs"], queryFn: getReceived });

  async function respond(action: () => Promise<void>, keys: string[]) {
    try {
      await action();
      await Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
    } catch (e) {
      Alert.alert("Action failed", (e as Error).message);
    }
  }

  const loading = requests.isLoading || recs.isLoading;

  const requestItems: InboxItem[] = (requests.data ?? []).map((r) => ({ kind: "request", data: r }));
  const recItems: InboxItem[] = (recs.data ?? []).map((r) => ({ kind: "rec", data: r }));
  const sections: { title: string; data: InboxItem[] }[] = [
    { title: "Friend requests", data: requestItems },
    { title: "Recommendations", data: recItems },
  ].filter((s) => s.data.length > 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Inbox" }} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : sections.length === 0 ? (
        <Text style={styles.msg}>Nothing here yet. Friend requests and recommendations show up in this inbox.</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) =>
            item.kind === "request" ? `req:${item.data.friendship.id}` : `rec:${item.data.rec.id}`
          }
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) =>
            item.kind === "request" ? (
              <View style={styles.row}>
                <Text style={styles.username}>@{item.data.profile?.username ?? "someone"}</Text>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.accept}
                    onPress={() => respond(() => acceptRequest(item.data.friendship.id), ["incoming-requests", "friends"])}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    style={styles.decline}
                    onPress={() => respond(() => declineRequest(item.data.friendship.id), ["incoming-requests"])}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.recRow}>
                  <PosterImage path={item.data.rec.poster_path} width={46} height={68} />
                  <View style={styles.meta}>
                    <Text style={styles.title}>{item.data.rec.title}</Text>
                    <Text style={styles.sub}>
                      from @{item.data.from?.username ?? "a friend"} ·{" "}
                      {item.data.rec.media_type === "movie" ? "MOVIE" : "TV"}
                    </Text>
                  </View>
                </View>
                {item.data.rec.note ? <Text style={styles.note}>“{item.data.rec.note}”</Text> : null}
                <View style={styles.btnRow}>
                  <Pressable
                    style={styles.recAccept}
                    onPress={() => respond(() => acceptRecommendation(item.data.rec), ["received-recs", "library"])}
                  >
                    <Text style={styles.acceptText}>Add to Want</Text>
                  </Pressable>
                  <Pressable
                    style={styles.dismiss}
                    onPress={() => respond(() => dismissRecommendation(item.data.rec.id), ["received-recs"])}
                  >
                    <Text style={styles.dismissText}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionHeader: { fontSize: 13, fontWeight: "700", color: "#888", marginTop: 16, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  username: { fontSize: 15, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },
  accept: { backgroundColor: "#5b6cff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  acceptText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  decline: { backgroundColor: "#f0f0f3", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  declineText: { color: "#333", fontWeight: "600", fontSize: 12 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12, marginBottom: 12 },
  recRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, color: "#888", marginTop: 2 },
  note: { backgroundColor: "#f0f0f3", borderRadius: 10, padding: 10, fontSize: 12, color: "#555", marginTop: 8 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  recAccept: { flex: 1, backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  dismiss: { flex: 1, backgroundColor: "#f0f0f3", borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  dismissText: { color: "#333", fontWeight: "600", fontSize: 13 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
