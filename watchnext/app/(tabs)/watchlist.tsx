import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getLibrary, rateEntry } from "../../src/services/watchlist";
import { sortLibrary, applyInlineRating, type LibrarySort } from "../../src/lib/libraryLogic";
import { PosterImage } from "../../src/components/PosterImage";
import { InlineRating } from "../../src/components/InlineRating";
import { ratingEmoji } from "../../src/lib/ratingScale";
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
  const [openRatingId, setOpenRatingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["library"] }),
      qc.invalidateQueries({ queryKey: ["incoming-requests"] }),
      qc.invalidateQueries({ queryKey: ["received-recs"] }),
    ]);
    setRefreshing(false);
  }
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

  const q = query.trim().toLowerCase();
  const filtered = (data ?? []).filter(
    (e) =>
      (filter === "all" || e.status === filter) &&
      (media === "all" || e.media_type === media) &&
      (q === "" || e.title.toLowerCase().includes(q))
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
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search your titles"
          placeholderTextColor="#aaa"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8} style={styles.searchClear}>
            <Text style={styles.searchClearText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
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
        q !== "" ? (
          <Text style={styles.msg}>No titles match "{query.trim()}".</Text>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.msg}>Nothing here yet.</Text>
            <Pressable style={styles.quickBtn} onPress={() => router.push("/quick-seen")}>
              <Text style={styles.quickBtnText}>⚡ Quick-add what you've seen</Text>
            </Pressable>
            <Text style={styles.emptyHint}>Tap through popular titles — fastest way to fill your list.</Text>
          </View>
        )
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(e) => e.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const open = openRatingId === item.id;
            return (
              <View style={styles.item}>
                <View style={styles.itemMain}>
                  <Pressable
                    style={styles.itemTap}
                    onPress={() => router.push(`/title/${item.media_type}/${item.tmdb_id}`)}
                  >
                    <PosterImage path={item.poster_path} width={46} height={68} />
                    <View style={styles.meta}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {[
                          STATUS_LABEL[item.status],
                          item.media_type === "movie" ? "Movie" : "TV",
                          item.year,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={[styles.ratingTap, open && styles.ratingTapOn]}
                    onPress={() => setOpenRatingId(open ? null : item.id)}
                    hitSlop={8}
                  >
                    {item.rating != null ? (
                      <Text style={styles.ratingEmoji}>{ratingEmoji(item.rating)}</Text>
                    ) : (
                      <Text style={styles.ratePrompt}>Rate</Text>
                    )}
                  </Pressable>
                </View>
                {open ? (
                  <View style={styles.pickerWrap}>
                    <InlineRating
                      value={item.rating}
                      onRate={(next) => {
                        handleRate(item.id, next);
                        setOpenRatingId(null);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

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

  filterRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    backgroundColor: "#f0f0f3",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 13, color: "#666", fontWeight: "600", textAlign: "center" },
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
  empty: { alignItems: "center", marginTop: 40, paddingHorizontal: 24 },
  quickBtn: { backgroundColor: "#5b6cff", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22, marginTop: 14 },
  quickBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  emptyHint: { color: "#aaa", fontSize: 12, marginTop: 12, textAlign: "center", lineHeight: 17 },

  item: { marginBottom: 14 },
  itemMain: { flexDirection: "row", gap: 12, alignItems: "center" },
  itemTap: { flex: 1, flexDirection: "row", gap: 12, alignItems: "center", minWidth: 0 },
  meta: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 15, fontWeight: "600" },
  itemSub: { fontSize: 12, color: "#888", marginTop: 2 },

  ratingTap: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f3",
  },
  ratingTapOn: { backgroundColor: "#e6e8ff" },
  ratingEmoji: { fontSize: 20 },
  ratePrompt: { fontSize: 12, color: "#999", fontWeight: "700" },
  pickerWrap: { marginTop: 8, paddingLeft: 58 },
});
