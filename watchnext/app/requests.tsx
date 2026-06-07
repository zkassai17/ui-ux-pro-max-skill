import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getIncomingRequests, acceptRequest, declineRequest } from "../src/services/friends";

export default function RequestsScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["incoming-requests"], queryFn: getIncomingRequests });

  async function respond(action: () => Promise<void>) {
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["incoming-requests"] });
      await qc.invalidateQueries({ queryKey: ["friends"] });
    } catch (e) {
      Alert.alert("Action failed", (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Friend requests" }} />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.friendship.id}
          ListEmptyComponent={<Text style={styles.msg}>No pending requests.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.username}>@{item.profile?.username ?? "someone"}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.accept} onPress={() => respond(() => acceptRequest(item.friendship.id))}>
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable style={styles.decline} onPress={() => respond(() => declineRequest(item.friendship.id))}>
                  <Text style={styles.declineText}>Decline</Text>
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
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  username: { fontSize: 15, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },
  accept: { backgroundColor: "#5b6cff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  acceptText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  decline: { backgroundColor: "#f0f0f3", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  declineText: { color: "#333", fontWeight: "600", fontSize: 12 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
