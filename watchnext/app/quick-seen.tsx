import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { discoverTitles, searchTitles } from "../src/services/catalog";
import { getLibrary, addToLibrary } from "../src/services/watchlist";
import { titleKey } from "../src/lib/forYouLogic";
import { PosterImage } from "../src/components/PosterImage";
import { useI18n } from "../src/i18n/I18nProvider";
import type { Title } from "../src/types/tmdb";

import { HEADING } from "../src/theme";
const COLS = 3;
const GAP = 10;
const PAGE_PAD = 16;
const POSTER_W = Math.floor((Dimensions.get("window").width - PAGE_PAD * 2 - GAP * (COLS - 1)) / COLS);
const POSTER_H = Math.round(POSTER_W * 1.5);

// One page of the tap-through pool: the most-rated (i.e. most widely-seen and
// recognizable) movies + TV, interleaved. Sorting by vote count surfaces the
// titles everyone has actually watched first, instead of momentary "popularity"
// buzz — so the shows you've seen are near the top, not buried pages down.
const MAX_POOL_PAGES = 12;
type Scope = "all" | "movie" | "tv";

async function fetchPoolPage(page: number, scope: Scope): Promise<{ results: Title[]; nextPage?: number }> {
  const get = (mediaType: "movie" | "tv") =>
    discoverTitles({ mediaType, page, sortBy: "vote_count.desc" }).then((p) => p.results).catch(() => [] as Title[]);

  let results: Title[];
  if (scope === "movie") results = await get("movie");
  else if (scope === "tv") results = await get("tv");
  else {
    const [movies, shows] = await Promise.all([get("movie"), get("tv")]);
    results = [];
    const maxLen = Math.max(movies.length, shows.length);
    for (let i = 0; i < maxLen; i++) {
      if (movies[i]) results.push(movies[i]);
      if (shows[i]) results.push(shows[i]);
    }
  }
  return { results, nextPage: page < MAX_POOL_PAGES ? page + 1 : undefined };
}

export default function QuickSeenScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const onboarding = from === "onboarding";
  const { t } = useI18n();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const sq = search.trim();
  const searching = sq.length > 1;

  const pool = useInfiniteQuery({
    queryKey: ["quick-seen-pool", scope],
    queryFn: ({ pageParam }) => fetchPoolPage(pageParam, scope),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 5 * 60 * 1000,
  });
  const lib = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const found = useQuery({
    queryKey: ["quick-seen-search", sq],
    queryFn: () => searchTitles(sq),
    enabled: searching,
    staleTime: 60 * 1000,
  });

  const poolRaw = pool.data?.pages.flatMap((p) => p.results) ?? [];

  // Accumulate every title we've shown (pool + each search) so a selection made
  // during one search still resolves when we save, even after the query changes.
  const known = useRef<Map<string, Title>>(new Map());
  for (const t of poolRaw) known.current.set(titleKey(t), t);
  for (const t of found.data ?? []) known.current.set(titleKey(t), t);

  // While searching show matches; otherwise show the popular tap-through pool.
  // Either way, drop titles already in the library (deduped, stable order).
  const excludeKeys = new Set(
    (lib.data ?? []).map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id }))
  );
  const poolTitles: Title[] = [];
  const seenKeys = new Set<string>();
  for (const t of poolRaw) {
    const k = titleKey(t);
    if (seenKeys.has(k) || excludeKeys.has(k)) continue;
    seenKeys.add(k);
    poolTitles.push(t);
  }
  const display: Title[] = searching
    ? (found.data ?? []).filter(
        (t) => !excludeKeys.has(titleKey(t)) && (scope === "all" || t.mediaType === scope)
      )
    : poolTitles;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function finish() {
    if (onboarding) router.replace("/(tabs)/for-you");
    else router.back();
  }

  const save = useMutation({
    mutationFn: async () => {
      const chosen = [...selected].map((k) => known.current.get(k)).filter((t): t is Title => !!t);
      setProgress(0);
      const CONCURRENCY = 5;
      let done = 0;
      for (let i = 0; i < chosen.length; i += CONCURRENCY) {
        const batch = chosen.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((t) => addToLibrary(t, "watched").catch(() => {})));
        done += batch.length;
        setProgress(done);
      }
      return chosen.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      finish();
    },
  });

  const count = selected.size;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Stack.Screen
        options={{
          title: t("quick.title"),
          headerRight: () =>
            onboarding ? (
              <Pressable onPress={finish} hitSlop={8}>
                <Text style={styles.skip}>{t("quick.skip")}</Text>
              </Pressable>
            ) : null,
        }}
      />

      {!onboarding ? (
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#5b6cff" />
          <Text style={styles.backText}>{t("common.back")}</Text>
        </Pressable>
      ) : null}

      <View style={styles.head}>
        <Text style={styles.title}>{t("quick.heading")}</Text>
        <Text style={styles.subtitle}>{t("quick.subtitle")}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t("quick.searchPlaceholder")}
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.scopeRow}>
        {(["all", "movie", "tv"] as Scope[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.scopeBtn, scope === s && styles.scopeBtnOn]}
            onPress={() => setScope(s)}
          >
            <Text style={[styles.scopeText, scope === s && styles.scopeTextOn]}>
              {s === "all" ? t("filter.all") : s === "movie" ? t("media.movies") : t("media.shows")}
            </Text>
          </Pressable>
        ))}
      </View>

      {!searching && pool.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>{t("quick.loading")}</Text>
        </View>
      ) : !searching && (pool.isError || (!pool.isLoading && poolTitles.length === 0)) ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t("quick.loadError")}</Text>
          <Pressable style={styles.linkBtn} onPress={finish}>
            <Text style={styles.linkText}>{t("common.continue")}</Text>
          </Pressable>
        </View>
      ) : searching && found.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>{t("quick.searching")}</Text>
        </View>
      ) : searching && display.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t("quick.noMatches")} "{sq}".</Text>
        </View>
      ) : (
        <FlatList
          data={display}
          keyExtractor={(t) => titleKey(t)}
          numColumns={COLS}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!searching && pool.hasNextPage && !pool.isFetchingNextPage) pool.fetchNextPage();
          }}
          ListFooterComponent={
            !searching && pool.isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={({ item }) => {
            const key = titleKey(item);
            const on = selected.has(key);
            return (
              <Pressable style={styles.cell} onPress={() => toggle(key)}>
                <View style={[styles.posterWrap, on && styles.posterWrapOn]}>
                  <PosterImage path={item.posterPath} width={POSTER_W} height={POSTER_H} radius={10} />
                  {on ? (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  ) : null}
                  {on ? <View style={styles.dim} /> : null}
                </View>
                <Text style={styles.cellTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {!pool.isLoading && poolTitles.length > 0 ? (
        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryBtn, (count === 0 || save.isPending) && styles.btnDisabled]}
            disabled={count === 0 || save.isPending}
            onPress={() => save.mutate()}
          >
            {save.isPending ? (
              <Text style={styles.primaryBtnText}>
                {t("quick.adding").replace("{done}", String(progress)).replace("{total}", String(count))}
              </Text>
            ) : (
              <Text style={styles.primaryBtnText}>
                {count === 0 ? t("quick.tapPrompt") : t("quick.addN").replace("{n}", String(count))}
              </Text>
            )}
          </Pressable>
          {!save.isPending ? (
            <Pressable style={styles.ghostBtn} onPress={finish}>
              <Text style={styles.ghostText}>{onboarding ? t("quick.skipForNow") : t("quick.done")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: PAGE_PAD, paddingTop: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginLeft: -4, marginBottom: 6 },
  backText: { color: "#5b6cff", fontSize: 16, fontWeight: "600" },
  head: { marginBottom: 14 },
  title: { fontFamily: HEADING, fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, color: "#666", lineHeight: 19, marginTop: 6 },
  skip: { color: "#5b6cff", fontWeight: "700", fontSize: 15 },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f3", borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 12 },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 16, color: "#111", padding: 0 },

  scopeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  scopeBtn: { flex: 1, alignItems: "center", backgroundColor: "#f0f0f3", borderRadius: 999, paddingVertical: 8 },
  scopeBtnOn: { backgroundColor: "#111" },
  scopeText: { fontSize: 13, color: "#666", fontWeight: "700" },
  scopeTextOn: { color: "#fff" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#888", fontSize: 13 },

  cell: { width: POSTER_W },
  posterWrap: { borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  posterWrapOn: { borderColor: "#5b6cff" },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(91,108,255,0.18)" },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#5b6cff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  checkMark: { color: "#fff", fontWeight: "800", fontSize: 14 },
  cellTitle: { fontSize: 11, fontWeight: "600", marginTop: 5, color: "#333" },

  footer: {
    position: "absolute",
    left: PAGE_PAD,
    right: PAGE_PAD,
    bottom: 20,
    gap: 6,
  },
  primaryBtn: { backgroundColor: "#5b6cff", borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
  ghostBtn: { alignItems: "center", paddingVertical: 8 },
  ghostText: { color: "#888", fontWeight: "600", fontSize: 13 },
  linkBtn: { paddingVertical: 10 },
  linkText: { color: "#5b6cff", fontWeight: "700", fontSize: 14 },
});
