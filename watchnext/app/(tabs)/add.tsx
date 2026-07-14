import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
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
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { searchTitles, discoverTitles, getTrendingTitles, getGenres, type TrendingScope } from "../../src/services/tmdb";
import { getLibrary } from "../../src/services/watchlist";
import { TitleRow } from "../../src/components/TitleRow";
import { StatusButtons } from "../../src/components/StatusButtons";
import { useI18n } from "../../src/i18n/I18nProvider";
import { TOP_PROVIDERS } from "../../src/lib/providers";
import { filterByLanguage } from "../../src/lib/recommendEngine";
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
  const navigation = useNavigation();
  const { t, lang } = useI18n();
  // Browse only shows titles in languages you'd actually watch (your app language
  // + English), so foreign-language randoms (e.g. Korean/Hindi) don't clutter it.
  // Typed search is exempt — if you search a specific foreign title, you still get it.
  const allowedLangs = new Set<string>(["en", lang]);

  // Lightning-bolt shortcut in the header → the bulk "Quick add what you've seen" flow.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push("/quick-seen")} hitSlop={10} style={styles.headerQuick}>
          <Text style={styles.headerQuickText}>⚡ {t("lib.quickAddShort")}</Text>
        </Pressable>
      ),
    });
  }, [navigation, router, t]);

  // Tapping the Add tab again jumps the results list back to the top.
  const listRef = useRef<FlatList<Title>>(null);
  useEffect(() => {
    const unsub = (navigation as any).addListener("tabPress", () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsub;
  }, [navigation]);

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
    // Browse the most-rated (recognizable, all-era) titles rather than this week's
    // buzz — so the opening view is familiar (Inception, Breaking Bad), not a wall
    // of brand-new releases. Trending stays available as its own chip.
    queryKey: ["tmdb-discover", mediaType, genreKey, providerKey],
    queryFn: ({ pageParam }) =>
      discoverTitles({ mediaType, genreIds, providerIds, sortBy: "vote_count.desc", minVotes: 300, page: pageParam }),
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
  // Language-scope the browse feed (not typed search).
  const scoped = searching ? rawResults : filterByLanguage(rawResults, allowedLangs);
  const inLibrary = new Set((library.data ?? []).map((e) => `${e.media_type}:${e.tmdb_id}`));
  const results: Title[] = dedupeByKey(scoped).filter((t) => {
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
        clearButtonMode="while-editing"
      />

      {/* Bulk-add shortcut — a lot to add? import it all at once. */}
      {!searching ? (
        <Pressable style={styles.importBanner} onPress={() => router.push("/import")}>
          <Ionicons name="cloud-upload-outline" size={18} color="#5b6cff" />
          <Text style={styles.importBannerText}>{t("build.import")}</Text>
          <Ionicons name="chevron-forward" size={16} color="#5b6cff" />
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
          ref={listRef}
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
  importBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#eef0ff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  importBannerText: { flex: 1, color: "#5b6cff", fontWeight: "800", fontSize: 13 },
  headerQuick: { backgroundColor: "#eef0ff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  headerQuickText: { color: "#5b6cff", fontWeight: "800", fontSize: 13 },
  filters: { marginBottom: 8 },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  toggle: { flex: 1, alignItems: "center", backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
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
