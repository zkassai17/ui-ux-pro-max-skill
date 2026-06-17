import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter, Stack } from "expo-router";
import { getFriends } from "../../src/services/friends";
import { getLibrary } from "../../src/services/watchlist";
import { computeTasteMatch } from "../../src/lib/tasteMatchLogic";
import type { Profile } from "../../src/types/db";

const MAX_FRIENDS = 3;
const SEARCH_AFTER = 6; // show the search box once the list is long enough to scroll

// Cold→warm scale so the % reads at a glance (mirrors TasteMatchCard).
function matchColor(score: number): string {
  if (score >= 80) return "#1dd1a1";
  if (score >= 60) return "#5b6cff";
  if (score >= 40) return "#ffc048";
  return "#ff9f43";
}

export default function GroupChooserScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const friends = data ?? [];

  const q = query.trim().toLowerCase();
  const visibleFriends = q ? friends.filter((f) => f.username.toLowerCase().includes(q)) : friends;

  // Taste-match % per friend: load my library once + each friend's, score each.
  const friendIds = friends.map((f) => f.id);
  const { data: scores } = useQuery({
    queryKey: ["watch-together-compat", friendIds.join(",")],
    enabled: friendIds.length > 0,
    queryFn: async () => {
      const mine = await getLibrary();
      const libs = await Promise.all(friendIds.map((id) => getLibrary(id).catch(() => [])));
      const map: Record<string, number | null> = {};
      friendIds.forEach((id, i) => {
        map[id] = computeTasteMatch(mine, libs[i]).score;
      });
      return map;
    },
  });

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
          {friends.length >= SEARCH_AFTER ? (
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search friends"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery("")} hitSlop={8} style={styles.searchClear}>
                  <Text style={styles.searchClearText}>✕</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <FlatList
            data={visibleFriends}
            keyExtractor={(f) => f.id}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              q ? <Text style={styles.noMatch}>No friends match “{query.trim()}”.</Text> : null
            }
            renderItem={({ item }: { item: Profile }) => {
              const on = selected.includes(item.id);
              const score = scores?.[item.id];
              return (
                <Pressable style={[styles.row, on && styles.rowOn]} onPress={() => toggle(item.id)}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.username}>@{item.username}</Text>
                    {score != null ? (
                      <Text style={[styles.compat, { color: matchColor(score) }]}>{score}% match</Text>
                    ) : scores ? (
                      <Text style={styles.compatNone}>New match</Text>
                    ) : null}
                  </View>
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f3",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 15, color: "#111", padding: 0 },
  searchClear: { paddingLeft: 8 },
  searchClearText: { fontSize: 13, color: "#999", fontWeight: "700" },
  noMatch: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
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
  rowLeft: { flex: 1, minWidth: 0 },
  username: { fontSize: 15, fontWeight: "600" },
  compat: { fontSize: 12, fontWeight: "700", marginTop: 3 },
  compatNone: { fontSize: 12, color: "#bbb", fontWeight: "600", marginTop: 3 },
  check: { fontSize: 18, color: "#bbb", fontWeight: "700", lineHeight: 22 },
  checkOn: { color: "#5b6cff" },
  primaryBtn: { backgroundColor: "#5b6cff", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnDisabled: { backgroundColor: "#c7ccff" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty: { marginTop: 40, alignItems: "center", gap: 16 },
  emptyText: { color: "#888", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
