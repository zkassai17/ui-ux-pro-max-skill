import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { searchTitles, discoverTitles, getGenres } from "../../src/services/tmdb";
import { getLibrary } from "../../src/services/watchlist";
import { TitleRow } from "../../src/components/TitleRow";
import { StatusButtons } from "../../src/components/StatusButtons";
import { TOP_PROVIDERS } from "../../src/lib/providers";
import type { MediaType, Title } from "../../src/types/tmdb";

function dedupeByKey(titles: Title[]): Title[] {
  const seen = new Set<string>();
  return titles.filter((t) => {
    const key = `${t.mediaType}:${t.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// How long a just-added title lingers in the Add list so an accidental add can be undone.
const GRACE_MS = 10000;

export default function AddScreen() {
  const [q, setQ] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [genreId, setGenreId] = useState<number | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  const router = useRouter();
  const searching = q.trim().length > 0;

  const search = useQuery({
    queryKey: ["tmdb-search", q.trim()],
    queryFn: () => searchTitles(q),
    enabled: searching,
  });
  const genres = useQuery({
    queryKey: ["tmdb-genres", mediaType],
    queryFn: () => getGenres(mediaType),
  });
  const library = useQuery({
    queryKey: ["library"],
    queryFn: () => getLibrary(),
  });
  const discover = useInfiniteQuery({
    queryKey: ["tmdb-discover", mediaType, genreId, providerId],
    queryFn: ({ pageParam }) => discoverTitles({ mediaType, genreId, providerId, page: pageParam }),
    enabled: !searching,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  function switchMedia(next: MediaType) {
    if (next === mediaType) return;
    setMediaType(next);
    setGenreId(null); // genre IDs differ between movie and tv
  }

  // Keys kept visible despite being in the library — a just-added title stays on
  // screen for GRACE_MS (or until the next search/filter) so an accidental add can be undone.
  const [grace, setGrace] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // A new search or filter change clears the grace window — added titles drop out then.
  const context = `${q.trim()}|${mediaType}|${genreId}|${providerId}`;
  useEffect(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    setGrace(new Set());
  }, [context]);

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const onAdded = useCallback((key: string) => {
    setGrace((prev) => new Set(prev).add(key));
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        setGrace((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, GRACE_MS)
    );
  }, []);

  const onRemoved = useCallback((key: string) => {
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    timers.current.delete(key);
    setGrace((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const rawResults: Title[] = searching
    ? search.data ?? []
    : discover.data?.pages.flatMap((p) => p.results) ?? [];
  const inLibrary = new Set((library.data ?? []).map((e) => `${e.media_type}:${e.tmdb_id}`));
  const results: Title[] = dedupeByKey(rawResults).filter((t) => {
    const key = `${t.mediaType}:${t.tmdbId}`;
    return !inLibrary.has(key) || grace.has(key);
  });
  const isLoading = searching ? search.isLoading : discover.isLoading;
  const isError = searching ? search.isError : discover.isError;
  const isFetching = searching ? search.isFetching : discover.isFetching;

  function retry() {
    if (searching) search.refetch();
    else discover.refetch();
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search movies & shows…"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {!searching ? (
        <View style={styles.filters}>
          <View style={styles.toggleRow}>
            {(["movie", "tv"] as MediaType[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.toggle, mediaType === m && styles.toggleOn]}
                onPress={() => switchMedia(m)}
              >
                <Text style={[styles.toggleText, mediaType === m && styles.toggleTextOn]}>
                  {m === "movie" ? "Movies" : "TV"}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {(genres.data ?? []).map((g) => (
              <Pressable
                key={g.id}
                style={[styles.chip, genreId === g.id && styles.chipOn]}
                onPress={() => setGenreId(genreId === g.id ? null : g.id)}
              >
                <Text style={[styles.chipText, genreId === g.id && styles.chipTextOn]}>{g.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {TOP_PROVIDERS.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.chip, providerId === p.id && styles.chipOn]}
                onPress={() => setProviderId(providerId === p.id ? null : p.id)}
              >
                <Text style={[styles.chipText, providerId === p.id && styles.chipTextOn]}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn't reach the catalog</Text>
          <Text style={styles.errorHint}>
            Your connection dropped for a moment. Check your internet and try again.
          </Text>
          <Pressable style={styles.retryBtn} onPress={retry} disabled={isFetching}>
            <Text style={styles.retryBtnText}>{isFetching ? "Retrying…" : "Try again"}</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : results.length === 0 ? (
        <Text style={styles.msg}>{searching ? "No results." : "Nothing matches those filters."}</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => `${t.mediaType}:${t.tmdbId}`}
          onEndReached={() => {
            if (!searching && discover.hasNextPage && !discover.isFetchingNextPage) {
              discover.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            !searching && discover.isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.resultItem}>
              <TitleRow
                title={item.title}
                subtitle={[item.year, item.rating ? `⭐ ${item.rating}` : null].filter(Boolean).join(" · ")}
                mediaType={item.mediaType}
                posterPath={item.posterPath}
                onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)}
              />
              <View style={styles.statusRow}>
                <StatusButtons
                  title={item}
                  onAdded={() => onAdded(`${item.mediaType}:${item.tmdbId}`)}
                  onRemoved={() => onRemoved(`${item.mediaType}:${item.tmdbId}`)}
                />
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
  search: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  filters: { marginBottom: 8 },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  toggle: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  toggleOn: { backgroundColor: "#111" },
  toggleText: { fontSize: 13, color: "#666", fontWeight: "600" },
  toggleTextOn: { color: "#fff" },
  chipRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 12, color: "#666", fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
  resultItem: { marginBottom: 18 },
  statusRow: { paddingLeft: 58, marginTop: -6 },
  errorBox: { marginTop: 40, alignItems: "center", paddingHorizontal: 24, gap: 8 },
  errorTitle: { fontSize: 15, fontWeight: "700", color: "#333" },
  errorHint: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 19 },
  retryBtn: { marginTop: 8, backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 28 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
