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
import { searchTitles, discoverTitles, getTrendingTitles, getGenres, type TrendingScope } from "../../src/services/tmdb";
import { getLibrary } from "../../src/services/watchlist";
import { TitleRow } from "../../src/components/TitleRow";
import { StatusButtons } from "../../src/components/StatusButtons";
import { useI18n } from "../../src/i18n/I18nProvider";
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
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [providerIds, setProviderIds] = useState<number[]>([]);
  const [trending, setTrending] = useState(false);
  const [trendScope, setTrendScope] = useState<TrendingScope>("all");
  const router = useRouter();
  const { t } = useI18n();

  function toggle(list: number[], id: number): number[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }
  const searching = q.trim().length > 0;
  // Three feed modes: live search, the mixed "Trending" feed, or the per-media
  // discover feed. Trending and genre filters are mutually exclusive (trending is
  // a sort across both media types; genres are per-media), but providers narrow both.
  const showingTrending = !searching && trending;
  const showingDiscover = !searching && !trending;

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
  // Stable, order-independent keys so the cache doesn't churn on selection order.
  const genreKey = [...genreIds].sort((a, b) => a - b).join(",");
  const providerKey = [...providerIds].sort((a, b) => a - b).join(",");
  const discover = useInfiniteQuery({
    queryKey: ["tmdb-discover", mediaType, genreKey, providerKey],
    queryFn: ({ pageParam }) => discoverTitles({ mediaType, genreIds, providerIds, page: pageParam }),
    enabled: showingDiscover,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
  const trend = useInfiniteQuery({
    queryKey: ["tmdb-trending", trendScope, providerKey],
    queryFn: ({ pageParam }) => getTrendingTitles({ scope: trendScope, providerIds, page: pageParam }),
    enabled: showingTrending,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  function switchMedia(next: MediaType) {
    if (next === mediaType) return;
    setMediaType(next);
    setGenreIds([]); // genre IDs differ between movie and tv
  }
  function toggleTrending() {
    setTrending((on) => !on);
    setGenreIds([]); // trending spans both media types; per-media genres don't apply
  }
  function pickGenre(id: number) {
    setTrending(false); // selecting a genre drops out of the mixed trending feed
    setGenreIds((cur) => toggle(cur, id));
  }

  // Keys kept visible despite being in the library — a just-added title stays on
  // screen for GRACE_MS (or until the next search/filter) so an accidental add can be undone.
  const [grace, setGrace] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // A new search or filter change clears the grace window — added titles drop out then.
  const context = `${q.trim()}|${mediaType}|${genreKey}|${providerKey}|${trending}|${trendScope}`;
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

  // The active infinite-scroll feed when not searching (trending or discover).
  const feed = showingTrending ? trend : discover;
  const rawResults: Title[] = searching
    ? search.data ?? []
    : feed.data?.pages.flatMap((p) => p.results) ?? [];
  const inLibrary = new Set((library.data ?? []).map((e) => `${e.media_type}:${e.tmdb_id}`));
  const results: Title[] = dedupeByKey(rawResults).filter((t) => {
    const key = `${t.mediaType}:${t.tmdbId}`;
    return !inLibrary.has(key) || grace.has(key);
  });
  const active = searching ? search : feed;
  const isLoading = active.isLoading;
  const isError = active.isError;
  const isFetching = active.isFetching;

  function retry() {
    active.refetch();
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder={t("add.searchPlaceholder")}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {!searching ? (
        <Pressable style={styles.quickAddLink} onPress={() => router.push("/quick-seen")} hitSlop={6}>
          <Text style={styles.quickAddLinkText}>{t("add.quickAddPrompt")} →</Text>
        </Pressable>
      ) : null}

      {!searching ? (
        <View style={styles.filters}>
          {trending ? (
            <View style={styles.toggleRow}>
              {(["all", "movie", "tv"] as TrendingScope[]).map((s) => (
                <Pressable
                  key={s}
                  style={[styles.toggle, trendScope === s && styles.toggleOn]}
                  onPress={() => setTrendScope(s)}
                >
                  <Text style={[styles.toggleText, trendScope === s && styles.toggleTextOn]}>
                    {s === "all" ? t("filter.all") : s === "movie" ? t("media.movies") : t("media.shows")}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.toggleRow}>
              {(["movie", "tv"] as MediaType[]).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.toggle, mediaType === m && styles.toggleOn]}
                  onPress={() => switchMedia(m)}
                >
                  <Text style={[styles.toggleText, mediaType === m && styles.toggleTextOn]}>
                    {m === "movie" ? t("media.movies") : t("media.shows")}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              style={[styles.chip, styles.trendChip, trending && styles.trendChipOn]}
              onPress={toggleTrending}
            >
              <Text style={[styles.chipText, styles.trendChipText, trending && styles.chipTextOn]}>
                🔥 {t("add.trending")}
              </Text>
            </Pressable>
            {(genres.data ?? []).map((g) => {
              const on = genreIds.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => pickGenre(g.id)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{g.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {TOP_PROVIDERS.map((p) => {
              const on = providerIds.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setProviderIds((cur) => toggle(cur, p.id))}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t("add.errorTitle")}</Text>
          <Text style={styles.errorHint}>{t("add.errorHint")}</Text>
          <Pressable style={styles.retryBtn} onPress={retry} disabled={isFetching}>
            <Text style={styles.retryBtnText}>{isFetching ? t("add.retrying") : t("add.tryAgain")}</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : results.length === 0 ? (
        <Text style={styles.msg}>{searching ? t("add.noResults") : t("add.noFilterMatch")}</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => `${t.mediaType}:${t.tmdbId}`}
          onEndReached={() => {
            if (!searching && feed.hasNextPage && !feed.isFetchingNextPage) {
              feed.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            !searching && feed.isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <TitleRow
              title={item.title}
              subtitle={[item.year, item.rating ? `⭐ ${item.rating}` : null].filter(Boolean).join(" · ")}
              mediaType={item.mediaType}
              posterPath={item.posterPath}
              onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)}
              accessory={
                <StatusButtons
                  title={item}
                  onAdded={() => onAdded(`${item.mediaType}:${item.tmdbId}`)}
                  onRemoved={() => onRemoved(`${item.mediaType}:${item.tmdbId}`)}
                />
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  quickAddLink: { alignSelf: "flex-start", marginBottom: 12, marginTop: -2 },
  quickAddLinkText: { color: "#5b6cff", fontWeight: "700", fontSize: 13 },
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
  trendChip: { backgroundColor: "#fff0e6" },
  trendChipOn: { backgroundColor: "#ff7a1a" },
  trendChipText: { color: "#e8650e" },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
  errorBox: { marginTop: 40, alignItems: "center", paddingHorizontal: 24, gap: 8 },
  errorTitle: { fontSize: 15, fontWeight: "700", color: "#333" },
  errorHint: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 19 },
  retryBtn: { marginTop: 8, backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 28 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
