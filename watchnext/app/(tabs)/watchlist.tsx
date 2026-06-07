import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getLibrary, rateEntry } from "../../src/services/watchlist";
import { sortLibrary, applyInlineRating, type LibrarySort } from "../../src/lib/libraryLogic";
import { PosterImage } from "../../src/components/PosterImage";
import { InlineRating } from "../../src/components/InlineRating";
import type { WatchStatus, WatchlistEntry } from "../../src/types/db";
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
  { key: "oldest", label: "Oldest first" },
  { key: "title", label: "Title A–Z" },
  { key: "title-desc", label: "Title Z–A" },
  { key: "rating", label: "My rating" },
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
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });

  async function handleRate(entryId: string, rating: number | null) {
    const prev = qc.getQueryData<WatchlistEntry[]>(["library"]);
    qc.setQueryData<WatchlistEntry[]>(["library"], (old) => applyInlineRating(old, entryId, rating));
    try {
      await rateEntry(entryId, rating);
      qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      qc.setQueryData(["library"], prev);
      Alert.alert("Couldn't save rating", (e as Error).message);
    }
  }

  const filtered = (data ?? []).filter(
    (e) =>
      (filter === "all" || e.status === filter) &&
      (media === "all" || e.media_type === media)
  );
  const rows = sortLibrary(filtered, sort);
  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? "Sort";

  function pickSort() {
    Alert.alert("Sort by", undefined, [
      ...SORTS.map((s) => ({ text: s.label, onPress: () => setSort(s.key) })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipOn]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.toolbar}>
        <View style={styles.segment}>
          {MEDIA_FILTERS.map((m) => (
            <Pressable
              key={m.key}
              style={[styles.segmentBtn, media === m.key && styles.segmentBtnOn]}
              onPress={() => setMedia(m.key)}
            >
              <Text style={[styles.segmentText, media === m.key && styles.segmentTextOn]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.sortBtn} onPress={pickSort} hitSlop={6}>
          <Text style={styles.sortBtnText}>⇅ {sortLabel}</Text>
        </Pressable>
      </View>

      {!isLoading ? (
        <Text style={styles.count}>
          {rows.length} {rows.length === 1 ? "title" : "titles"}
        </Text>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <Text style={styles.msg}>Nothing here yet. Use the Add tab to find something to watch.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Pressable
                style={styles.itemMain}
                onPress={() => router.push(`/title/${item.media_type}/${item.tmdb_id}`)}
              >
                <PosterImage path={item.poster_path} width={46} height={68} />
                <View style={styles.meta}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemSub} numberOfLines={1}>
                    {`${STATUS_LABEL[item.status]} · ${item.media_type === "movie" ? "Movie" : "TV"}`}
                  </Text>
                </View>
              </Pressable>
              <InlineRating value={item.rating} onRate={(next) => handleRate(item.id, next)} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  filterScroll: { flexGrow: 0 },
  filterRow: { gap: 8, paddingRight: 8, paddingBottom: 2, alignItems: "center" },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 13, lineHeight: 18, color: "#666", fontWeight: "600" },
  chipTextOn: { color: "#fff" },

  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  segment: { flexDirection: "row", backgroundColor: "#f0f0f3", borderRadius: 999, padding: 3 },
  segmentBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  segmentBtnOn: { backgroundColor: "#111" },
  segmentText: { fontSize: 12, color: "#666", fontWeight: "600" },
  segmentTextOn: { color: "#fff" },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  sortBtnText: { fontSize: 12, color: "#5b6cff", fontWeight: "700" },

  count: { fontSize: 11, color: "#aaa", fontWeight: "600", marginTop: 10, marginBottom: 4 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },

  item: { marginBottom: 16 },
  itemMain: { flexDirection: "row", gap: 12, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 15, fontWeight: "600" },
  itemSub: { fontSize: 12, color: "#888", marginTop: 2 },
});
