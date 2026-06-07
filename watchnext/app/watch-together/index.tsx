import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter, Stack } from "expo-router";
import { getFriends } from "../../src/services/friends";
import type { Profile } from "../../src/types/db";

const MAX_FRIENDS = 3;

export default function GroupChooserScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const [selected, setSelected] = useState<string[]>([]);
  const friends = data ?? [];

  function toggle(id: string) {
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= MAX_FRIENDS
        ? cur
        : [...cur, id]
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Watch together" }} />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : friends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Add a friend first — then you can find something to watch together.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push("/friends/add")}>
            <Text style={styles.primaryBtnText}>Add a friend</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.help}>
            Pick up to {MAX_FRIENDS} friends · {selected.length} selected
          </Text>
          <FlatList
            data={friends}
            keyExtractor={(f) => f.id}
            contentContainerStyle={{ paddingBottom: 12 }}
            renderItem={({ item }: { item: Profile }) => {
              const on = selected.includes(item.id);
              return (
                <Pressable style={[styles.row, on && styles.rowOn]} onPress={() => toggle(item.id)}>
                  <Text style={styles.username}>@{item.username}</Text>
                  <Text style={[styles.check, on && styles.checkOn]}>{on ? "✓" : "+"}</Text>
                </Pressable>
              );
            }}
          />
          <Pressable
            style={[styles.primaryBtn, selected.length === 0 && styles.btnDisabled]}
            disabled={selected.length === 0}
            onPress={() => router.push(`/watch-together/${selected.join(",")}`)}
          >
            <Text style={styles.primaryBtnText}>See picks</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  help: { fontSize: 12, color: "#888", fontWeight: "600", marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rowOn: { borderColor: "#5b6cff", backgroundColor: "#eef0ff" },
  username: { fontSize: 15, fontWeight: "600" },
  check: { fontSize: 18, color: "#bbb", fontWeight: "700", lineHeight: 22 },
  checkOn: { color: "#5b6cff" },
  primaryBtn: { backgroundColor: "#5b6cff", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnDisabled: { backgroundColor: "#c7ccff" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty: { marginTop: 40, alignItems: "center", gap: 16 },
  emptyText: { color: "#888", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
