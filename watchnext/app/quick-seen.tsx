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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTrending, discoverTitles, searchTitles } from "../src/services/tmdb";
import { getLibrary, addToLibrary } from "../src/services/watchlist";
import { buildCandidatePool } from "../src/lib/quickSeenLogic";
import { titleKey } from "../src/lib/forYouLogic";
import { PosterImage } from "../src/components/PosterImage";
import type { Title } from "../src/types/tmdb";

const COLS = 3;
const GAP = 10;
const PAGE_PAD = 16;
const POSTER_W = Math.floor((Dimensions.get("window").width - PAGE_PAD * 2 - GAP * (COLS - 1)) / COLS);
const POSTER_H = Math.round(POSTER_W * 1.5);

// Pull a broad, recognizable pool: this week's trending + most-popular movies
// and TV. More than enough familiar titles to tap through in a minute.
async function fetchPool(): Promise<Title[]> {
  const [trending, lib, movies1, tv1, movies2, tv2] = await Promise.all([
    getTrending().catch(() => [] as Title[]),
    getLibrary().catch(() => []),
    discoverTitles({ mediaType: "movie", page: 1 }).then((p) => p.results).catch(() => [] as Title[]),
    discoverTitles({ mediaType: "tv", page: 1 }).then((p) => p.results).catch(() => [] as Title[]),
    discoverTitles({ mediaType: "movie", page: 2 }).then((p) => p.results).catch(() => [] as Title[]),
    discoverTitles({ mediaType: "tv", page: 2 }).then((p) => p.results).catch(() => [] as Title[]),
  ]);
  const exclude = new Set(lib.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })));
  return buildCandidatePool([trending, movies1, tv1, movies2, tv2], exclude);
}

export default function QuickSeenScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const onboarding = from === "onboarding";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const sq = search.trim();
  const searching = sq.length > 1;

  const pool = useQuery({ queryKey: ["quick-seen-pool"], queryFn: fetchPool, staleTime: 5 * 60 * 1000 });
  const lib = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const found = useQuery({
    queryKey: ["quick-seen-search", sq],
    queryFn: () => searchTitles(sq),
    enabled: searching,
    staleTime: 60 * 1000,
  });

  // Accumulate every title we've shown (pool + each search) so a selection made
  // during one search still resolves when we save, even after the query changes.
  const known = useRef<Map<string, Title>>(new Map());
  for (const t of pool.data ?? []) known.current.set(titleKey(t), t);
  for (const t of found.data ?? []) known.current.set(titleKey(t), t);

  // While searching show matches (minus titles already in the library); otherwise
  // show the popular tap-through pool.
  const excludeKeys = new Set(
    (lib.data ?? []).map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id }))
  );
  const display: Title[] = searching
    ? (found.data ?? []).filter((t) => !excludeKeys.has(titleKey(t)))
    : pool.data ?? [];

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
          title: "Quick add",
          headerRight: () =>
            onboarding ? (
              <Pressable onPress={finish} hitSlop={8}>
                <Text style={styles.skip}>Skip</Text>
              </Pressable>
            ) : null,
        }}
      />

      <View style={styles.head}>
        <Text style={styles.title}>Seen any of these?</Text>
        <Text style={styles.subtitle}>
          Tap everything you've watched — on any service. We'll add them to your Watched list so your
          matches and picks work right away.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search for a title you've seen…"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {!searching && pool.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading popular titles…</Text>
        </View>
      ) : !searching && (pool.isError || (pool.data && pool.data.length === 0)) ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Couldn't load titles right now.</Text>
          <Pressable style={styles.linkBtn} onPress={finish}>
            <Text style={styles.linkText}>Continue</Text>
          </Pressable>
        </View>
      ) : searching && found.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : searching && display.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>No matches for "{sq}".</Text>
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

      {!pool.isLoading && (pool.data?.length ?? 0) > 0 ? (
        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryBtn, (count === 0 || save.isPending) && styles.btnDisabled]}
            disabled={count === 0 || save.isPending}
            onPress={() => save.mutate()}
          >
            {save.isPending ? (
              <Text style={styles.primaryBtnText}>Adding {progress}/{count}…</Text>
            ) : (
              <Text style={styles.primaryBtnText}>
                {count === 0 ? "Tap the ones you've seen" : `Add ${count} to Watched`}
              </Text>
            )}
          </Pressable>
          {!save.isPending ? (
            <Pressable style={styles.ghostBtn} onPress={finish}>
              <Text style={styles.ghostText}>{onboarding ? "Skip for now" : "Done"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: PAGE_PAD, paddingTop: 12 },
  head: { marginBottom: 14 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, color: "#666", lineHeight: 19, marginTop: 6 },
  skip: { color: "#5b6cff", fontWeight: "700", fontSize: 15 },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f3", borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 12 },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 16, color: "#111", padding: 0 },

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
