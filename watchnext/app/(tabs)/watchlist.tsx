import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getLibrary } from "../../src/services/watchlist";
import { sortLibrary, type LibrarySort } from "../../src/lib/libraryLogic";
import { TitleRow } from "../../src/components/TitleRow";
import type { WatchStatus } from "../../src/types/db";
import type { MediaType } from "../../src/types/tmdb";

const FILTERS: { key: "all" | WatchStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "want", label: "Want" },
  { key: "watching", label: "Watching" },
  { key: "watched", label: "Watched" },
];

const MEDIA_FILTERS: { key: "all" | MediaType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "tv", label: "TV" },
];

const SORTS: { key: LibrarySort; label: string }[] = [
  { key: "recent", label: "Recently added" },
  { key: "title", label: "Title A–Z" },
];

const STATUS_LABEL: Record<WatchStatus, string> = {
  want: "Want to watch",
  watching: "Watching",
  watched: "Watched ✓",
};

export default function LibraryScreen() {
  const [filter, setFilter] = useState<"all" | WatchStatus>("all");
  const [media, setMedia] = useState<"all" | MediaType>("all");
  const [sort, setSort] = useState<LibrarySort>("recent");
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const filtered = (data ?? []).filter(
    (e) =>
      (filter === "all" || e.status === filter) &&
      (media === "all" || e.media_type === media)
  );
  const rows = sortLibrary(filtered, sort);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {MEDIA_FILTERS.map((m) => (
          <Pressable
            key={m.key}
            style={[styles.chip, media === m.key && styles.chipOn]}
            onPress={() => setMedia(m.key)}
          >
            <Text style={[styles.chipText, media === m.key && styles.chipTextOn]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
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
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort</Text>
        {SORTS.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.sortChip, sort === s.key && styles.sortChipOn]}
            onPress={() => setSort(s.key)}
          >
            <Text style={[styles.sortChipText, sort === s.key && styles.sortChipTextOn]}>{s.label}</Text>
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
  filters: { flexDirection: "row", gap: 8, marginBottom: 10 },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 12, color: "#666" },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  sortRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 14 },
  sortLabel: { fontSize: 11, color: "#999", fontWeight: "700" },
  sortChip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  sortChipOn: { backgroundColor: "#111" },
  sortChipText: { fontSize: 11, color: "#666" },
  sortChipTextOn: { color: "#fff", fontWeight: "600" },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
