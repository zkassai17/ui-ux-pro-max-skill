import { useState, useEffect, useRef } from "react";
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
import { useRouter, useNavigation } from "expo-router";
import { getLibrary, rateEntry } from "../../src/services/watchlist";
import { sortLibrary, applyInlineRating, type LibrarySort } from "../../src/lib/libraryLogic";
import { PosterImage } from "../../src/components/PosterImage";
import { InlineRating } from "../../src/components/InlineRating";
import { ratingEmoji } from "../../src/lib/ratingScale";
import { getDefaultLibraryTab } from "../../src/services/prefs";
import { useI18n } from "../../src/i18n/I18nProvider";
import type { WatchStatus, WatchlistEntry } from "../../src/types/db";
import type { MediaType } from "../../src/types/tmdb";

const FILTER_KEYS: WatchStatus[] = ["want", "watching", "watched"];
const MEDIA_KEYS: ("all" | MediaType)[] = ["all", "movie", "tv"];
const SORT_KEYS: LibrarySort[] = ["recent", "oldest", "title", "title-desc", "rating"];

const MEDIA_I18N: Record<"all" | MediaType, string> = {
  all: "filter.all",
  movie: "media.movies",
  tv: "media.shows",
};
const SORT_I18N: Record<LibrarySort, string> = {
  recent: "sort.recent",
  oldest: "sort.oldest",
  title: "sort.titleAsc",
  "title-desc": "sort.titleDesc",
  rating: "sort.rating",
};
const STATUS_I18N: Record<WatchStatus, string> = {
  want: "libstatus.want",
  watching: "libstatus.watching",
  watched: "libstatus.watched",
};

export default function LibraryScreen() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<WatchStatus>("want");
  // Honor the user's "Library opens on" preference on first mount.
  useEffect(() => {
    getDefaultLibraryTab().then(setFilter);
  }, []);
  const [media, setMedia] = useState<"all" | MediaType>("all");
  const [sort, setSort] = useState<LibrarySort>("recent");
  const [openRatingId, setOpenRatingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<WatchlistEntry>>(null);
  const navigation = useNavigation();

  // Tapping the Library tab again jumps the list back to the top — no scrolling up.
  useEffect(() => {
    const unsub = (navigation as any).addListener("tabPress", () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsub;
  }, [navigation]);

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
  const { data, isLoading, isError } = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });

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
      e.status === filter &&
      (media === "all" || e.media_type === media) &&
      (q === "" || e.title.toLowerCase().includes(q))
  );
  const rows = sortLibrary(filtered, sort);
  const sortLabel = t(SORT_I18N[sort]);

  function pickSort() {
    Alert.alert(t("sort.sortBy"), undefined, [
      ...SORT_KEYS.map((k) => ({ text: t(SORT_I18N[k]), onPress: () => setSort(k) })),
      { text: t("common.cancel"), style: "cancel" as const },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>{t("tab.library")}</Text>
        <Pressable style={styles.quickAddPill} onPress={() => router.push("/quick-seen")} hitSlop={6}>
          <Text style={styles.quickAddPillText}>⚡ {t("lib.quickAddShort")}</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t("lib.searchPlaceholder")}
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
        {FILTER_KEYS.map((key) => (
          <Pressable
            key={key}
            style={[styles.chip, filter === key && styles.chipOn]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextOn]}>{t(`status.${key}`)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.segment}>
          {MEDIA_KEYS.map((key) => (
            <Pressable
              key={key}
              style={[styles.segmentBtn, media === key && styles.segmentBtnOn]}
              onPress={() => setMedia(key)}
            >
              <Text style={[styles.segmentText, media === key && styles.segmentTextOn]}>
                {t(MEDIA_I18N[key])}
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
          {rows.length} {rows.length === 1 ? t("lib.title") : t("lib.titles")}
        </Text>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📡</Text>
          <Text style={styles.msg}>{t("add.errorHint")}</Text>
          <Pressable style={styles.quickBtn} onPress={onRefresh}>
            <Text style={styles.quickBtnText}>{t("add.tryAgain")}</Text>
          </Pressable>
        </View>
      ) : rows.length === 0 ? (
        q !== "" ? (
          <Text style={styles.msg}>{t("lib.noMatch")} "{query.trim()}".</Text>
        ) : (data ?? []).length === 0 ? (
          // Whole library empty — the full onboarding empty state.
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎬</Text>
            <Text style={styles.msg}>{t("lib.emptyTitle")}</Text>
            <Pressable style={styles.quickBtn} onPress={() => router.push("/quick-seen")}>
              <Text style={styles.quickBtnText}>⚡ {t("lib.quickAdd")}</Text>
            </Pressable>
            <Text style={styles.emptyHint}>{t("lib.quickAddHint")}</Text>
          </View>
        ) : (
          // Library has items, just not in THIS filter.
          <Text style={styles.msg}>{t("lib.emptyList")}</Text>
        )
      ) : (
        <FlatList
          ref={listRef}
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
                          t(STATUS_I18N[item.status]),
                          item.media_type === "movie" ? t("media.movie") : t("media.tv"),
                          item.year,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                  </Pressable>
                  {item.status !== "want" ? (
                    <Pressable
                      style={[styles.ratingTap, open && styles.ratingTapOn]}
                      onPress={() => setOpenRatingId(open ? null : item.id)}
                      hitSlop={8}
                    >
                      {item.rating != null ? (
                        <Text style={styles.ratingEmoji}>{ratingEmoji(item.rating)}</Text>
                      ) : (
                        <Text style={styles.ratePrompt}>{t("lib.rate")}</Text>
                      )}
                    </Pressable>
                  ) : null}
                </View>
                {open && item.status !== "want" ? (
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

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  screenTitle: { fontSize: 22, fontWeight: "800" },
  quickAddPill: { backgroundColor: "#eef0ff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  quickAddPillText: { color: "#5b6cff", fontWeight: "800", fontSize: 13 },

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
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
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
