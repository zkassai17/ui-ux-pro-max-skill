import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getLibrary } from "../../src/services/watchlist";
import { TitleRow } from "../../src/components/TitleRow";
import type { WatchStatus } from "../../src/types/db";

const FILTERS: { key: "all" | WatchStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "want", label: "Want" },
  { key: "watching", label: "Watching" },
  { key: "watched", label: "Watched" },
];

const STATUS_LABEL: Record<WatchStatus, string> = {
  want: "Want to watch",
  watching: "Watching",
  watched: "Watched ✓",
};

export default function LibraryScreen() {
  const [filter, setFilter] = useState<"all" | WatchStatus>("all");
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const rows = (data ?? []).filter((e) => filter === "all" || e.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipOn]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <Text style={styles.msg}>Nothing here yet. Use the Add tab to find something to watch.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <TitleRow
              title={item.title}
              subtitle={STATUS_LABEL[item.status]}
              mediaType={item.media_type}
              posterPath={item.poster_path}
              onPress={() => router.push(`/title/${item.media_type}/${item.tmdb_id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 14 },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 12, color: "#666" },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
