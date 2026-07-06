import { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth/AuthProvider";
import { getFeed, type FeedRow } from "../../src/services/feed";
import { getLibrary } from "../../src/services/watchlist";
import { getForYou } from "../../src/services/forYou";
import { getHiddenKeys, hideRec } from "../../src/services/hiddenRecs";
import { getRecWeights } from "../../src/services/prefs";
import { getFriends } from "../../src/services/friends";
import { getTrending } from "../../src/services/tmdb";
import { titleKey } from "../../src/lib/forYouLogic";
import { pickTonight } from "../../src/lib/tonightPick";
import { computeTasteMatch } from "../../src/lib/tasteMatchLogic";
import { filterByLanguage } from "../../src/lib/recommendEngine";
import { relativeTime } from "../../src/lib/relativeTime";
import { initials, avatarColor, matchColor } from "../../src/lib/avatar";
import { getReactions } from "../../src/services/reactions";
import { PosterImage } from "../../src/components/PosterImage";
import { QuickAddButton } from "../../src/components/QuickAddButton";
import { FeedReactions } from "../../src/components/FeedReactions";
import { CDrawLoader } from "../../src/components/CDrawLoader";
import { useI18n } from "../../src/i18n/I18nProvider";
import { fullName } from "../../src/types/db";
import type { Title, MediaType } from "../../src/types/tmdb";
import type { WatchStatus } from "../../src/types/db";

// --- Tonight's pick: one spotlighted recommendation (top of your movie rail,
// so it reuses that query — no extra fetch) ---
function TonightHero({ mediaType }: { mediaType: MediaType }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useI18n();
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const recWeights = useQuery({ queryKey: ["rec-weights"], queryFn: getRecWeights });
  const hidden = useQuery({ queryKey: ["hidden-recs"], queryFn: getHiddenKeys });
  const entries = library.data ?? [];
  const excludeKeys = new Set(entries.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })));
  const libHash = entries.map((e) => `${e.media_type}:${e.tmdb_id}:${e.status}:${e.rating ?? ""}`).join("|");
  const w = recWeights.data;
  const weightKey = w ? `${w.content}-${w.collaborative}-${w.trending}` : "default";
  const recs = useQuery({
    queryKey: ["for-you", mediaType, libHash, weightKey],
    enabled: !library.isLoading && !recWeights.isLoading,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getForYou(mediaType, entries, w),
  });

  // "Not interested": hide this pick instantly (optimistic) and refetch so a fresh
  // one backfills. Also trains the engine — the dismissed title's genres feed the
  // dislike profile, so the same kind of pick stops surfacing.
  const hide = useMutation({
    mutationFn: (tt: Title) => hideRec(tt),
    onMutate: async (tt: Title) => {
      await qc.cancelQueries({ queryKey: ["hidden-recs"] });
      const prev = qc.getQueryData<Set<string>>(["hidden-recs"]);
      qc.setQueryData<Set<string>>(["hidden-recs"], new Set([...(prev ?? []), titleKey(tt)]));
      return { prev };
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) qc.setQueryData(["hidden-recs"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["for-you"] }),
  });

  const hiddenSet = hidden.data ?? new Set<string>();
  // Session-only skips: dismissing a Want-list pick means "not tonight", NOT
  // "never" — so it rotates without nuking a title you still want to watch.
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const blocked = new Set<string>([...hiddenSet, ...skipped]);

  // Prefer something you already WANT to watch; fall back to a recommendation.
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const wantPick = pickTonight(entries, blocked, dayNumber);
  const recPick = (recs.data ?? []).find(
    (x) => !excludeKeys.has(titleKey(x)) && !blocked.has(titleKey(x)),
  );
  const hero = wantPick ?? recPick ?? null;
  const fromWant = wantPick != null;
  if (!hero) return null;

  function dismiss() {
    if (!hero) return;
    const key = titleKey(hero);
    setSkipped((prev) => new Set([...prev, key]));
    // Only "not interested"-train the engine for recommendation picks. A Want-list
    // pick you skip tonight should still stay in your list and your recs.
    if (!fromWant) hide.mutate(hero);
  }

  return (
    <View style={styles.hero}>
      <Pressable style={styles.heroClose} hitSlop={8} onPress={dismiss} accessibilityLabel="Not tonight">
        <Ionicons name="close" size={15} color="#fff" />
      </Pressable>
      <Pressable onPress={() => router.push(`/title/${hero.mediaType}/${hero.tmdbId}`)}>
        <Text style={styles.heroLabel}>✨ {t("home.tonightsPick")}</Text>
        <View style={styles.heroBody}>
          <PosterImage path={hero.posterPath} width={92} height={138} radius={12} />
          <View style={styles.heroMeta}>
            <Text style={styles.heroTitle} numberOfLines={3}>{hero.title}</Text>
            <Text style={styles.heroType}>
              {hero.mediaType === "movie" ? t("media.movie") : t("media.tv")}{hero.year ? ` · ${hero.year}` : ""}
            </Text>
            {fromWant ? (
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>🔖 {t("home.onYourList")}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// --- Blend teaser: your single best taste-match, deep-linking into Blend ---
function BlendTeaser() {
  const router = useRouter();
  const { t } = useI18n();
  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const allFriends = friends.data ?? [];
  const friendIds = allFriends.map((f) => f.id);
  const compat = useQuery({
    queryKey: ["together-compat", friendIds.join(",")],
    enabled: friendIds.length > 0 && !library.isLoading,
    queryFn: async () => {
      const mine = library.data ?? (await getLibrary());
      const libs = await Promise.all(friendIds.map((id) => getLibrary(id).catch(() => [])));
      const map: Record<string, number | null> = {};
      friendIds.forEach((id, i) => (map[id] = computeTasteMatch(mine, libs[i]).score));
      return map;
    },
  });
  if (!compat.data) return null;
  let best: { id: string; score: number; username: string; name: string } | null = null;
  for (const f of allFriends) {
    const s = compat.data[f.id];
    if (s != null && (!best || s > best.score)) {
      best = { id: f.id, score: s, username: f.username, name: fullName(f) || `@${f.username}` };
    }
  }
  if (!best) return null;
  return (
    <Pressable style={styles.teaser} onPress={() => router.push(`/blend/${best!.id}`)}>
      <View style={[styles.teaserAvatar, { backgroundColor: avatarColor(best.username) }]}>
        <Text style={styles.teaserAvatarText}>{initials(best.username)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.teaserName} numberOfLines={1}>🧬 {best.name}</Text>
        <Text style={styles.teaserSub}>{t("home.topMatch")}</Text>
      </View>
      <Text style={[styles.teaserPct, { color: matchColor(best.score) }]}>{best.score}%</Text>
      <Text style={styles.teaserChevron}>›</Text>
    </Pressable>
  );
}

// --- Trending this week: discovery beyond your taste ---
function TrendingRow() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const trending = useQuery({ queryKey: ["home-trending"], queryFn: getTrending, staleTime: 30 * 60 * 1000 });
  // Same language scope as the Add browse — no random foreign-language titles.
  const allowed = new Set<string>(["en", lang]);
  const titles = filterByLanguage(trending.data ?? [], allowed).slice(0, 15);
  if (titles.length === 0) return null;
  return (
    <View style={styles.rail}>
      <Text style={styles.sectionHeading}>🔥 {t("home.trending")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railRow}>
        {titles.map((tt) => (
          <Pressable
            key={`${tt.mediaType}:${tt.tmdbId}`}
            style={styles.suggestion}
            onPress={() => router.push(`/title/${tt.mediaType}/${tt.tmdbId}`)}
          >
            <PosterImage path={tt.posterPath} width={104} height={156} radius={10} />
            <Text style={styles.suggestionTitle} numberOfLines={2}>{tt.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const VERB_KEY: Record<WatchStatus, string> = {
  watched: "feed.finishedWatching",
  watching: "feed.isWatching",
  want: "feed.wantsToWatch",
};

// Avatar + "@name verb" header line (with a relative time) shared by every card.
function FeedCardHeader({ username, verb, at }: { username: string | null; verb: string; at: string }) {
  const { t } = useI18n();
  const uname = username ?? undefined;
  const name = username ? `@${username}` : t("feed.aFriend");
  const time = relativeTime(at, Date.now());
  return (
    <View style={styles.cardHead}>
      <View style={[styles.cardAvatar, { backgroundColor: avatarColor(uname) }]}>
        <Text style={styles.cardAvatarText}>{initials(uname)}</Text>
      </View>
      <Text style={styles.cardHeadText} numberOfLines={1}>
        <Text style={styles.name}>{name}</Text> <Text style={styles.verb}>{verb}</Text>
        {time ? <Text style={styles.time}>{`  ·  ${time}`}</Text> : null}
      </Text>
    </View>
  );
}

function ForYouRail({ mediaType, heading, skipFirst }: { mediaType: MediaType; heading: string; skipFirst?: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const recWeights = useQuery({ queryKey: ["rec-weights"], queryFn: getRecWeights });
  const hidden = useQuery({ queryKey: ["hidden-recs"], queryFn: getHiddenKeys });

  // "Not interested": hide the title instantly (optimistic), then refetch the rail
  // so a fresh pick backfills its slot.
  const hide = useMutation({
    mutationFn: (t: Title) => hideRec(t),
    onMutate: async (t: Title) => {
      await qc.cancelQueries({ queryKey: ["hidden-recs"] });
      const prev = qc.getQueryData<Set<string>>(["hidden-recs"]);
      qc.setQueryData<Set<string>>(["hidden-recs"], new Set([...(prev ?? []), titleKey(t)]));
      return { prev };
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) qc.setQueryData(["hidden-recs"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["for-you"] }),
  });

  const entries = library.data ?? [];
  const excludeKeys = new Set(entries.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })));
  // Re-derive whenever the library changes (status/rating included) so recs stay fresh.
  const libHash = entries
    .map((e) => `${e.media_type}:${e.tmdb_id}:${e.status}:${e.rating ?? ""}`)
    .join("|");
  const w = recWeights.data;
  const weightKey = w ? `${w.content}-${w.collaborative}-${w.trending}` : "default";

  const recs = useQuery({
    queryKey: ["for-you", mediaType, libHash, weightKey],
    enabled: !library.isLoading && !recWeights.isLoading,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getForYou(mediaType, entries, w),
  });

  // Re-filter on every render so a title you just added (or hid) drops out
  // instantly — before the query has a chance to refetch.
  const hiddenSet = hidden.data ?? new Set<string>();
  const all = (recs.data ?? []).filter(
    (t) => !excludeKeys.has(titleKey(t)) && !hiddenSet.has(titleKey(t))
  );
  // Drop the first pick when it's already shown as the "Tonight's pick" hero.
  const titles = skipFirst ? all.slice(1) : all;

  if (recs.isLoading || library.isLoading) {
    return (
      <View style={styles.rail}>
        <Text style={styles.sectionHeading}>{heading}</Text>
        <ActivityIndicator style={{ marginVertical: 16 }} />
      </View>
    );
  }
  if (titles.length === 0) return null;

  return (
    <View style={styles.rail}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railRow}>
        {titles.map((t: Title) => (
          <View key={`${t.mediaType}:${t.tmdbId}`} style={styles.suggestion}>
            {/* Poster + the add button are siblings, so tapping + never triggers navigation. */}
            <View>
              <Pressable onPress={() => router.push(`/title/${t.mediaType}/${t.tmdbId}`)}>
                <PosterImage path={t.posterPath} width={104} height={156} radius={10} />
              </Pressable>
              <Pressable
                style={styles.hideBtn}
                hitSlop={8}
                onPress={() => hide.mutate(t)}
                accessibilityLabel="Not interested"
              >
                <Ionicons name="close" size={13} color="#fff" />
              </Pressable>
              <View style={styles.posterAdd} pointerEvents="box-none">
                <QuickAddButton title={t} compact addStatus="want" />
              </View>
            </View>
            <Pressable onPress={() => router.push(`/title/${t.mediaType}/${t.tmdbId}`)}>
              <Text style={styles.suggestionTitle} numberOfLines={2}>
                {t.title}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const qc = useQueryClient();
  const router = useRouter();
  const { t } = useI18n();
  const { profile } = useAuth();
  const greetName = profile?.first_name?.trim() || profile?.username || "";
  const greeting = greetName ? `${t("home.greeting")} ${greetName} 👋` : `${t("home.greeting")} 👋`;
  const { data, isLoading, isError } = useQuery({ queryKey: ["feed"], queryFn: getFeed });
  // Spotlight a pick from whichever you watch more of (movies vs shows), so the
  // hero can be a TV show too — and the matching rail skips it to avoid a dup.
  const lib = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const libEntries = lib.data ?? [];
  const tvCount = libEntries.filter((e) => e.media_type === "tv").length;
  const movieCount = libEntries.filter((e) => e.media_type === "movie").length;
  const heroMedia: MediaType = tvCount > movieCount ? "tv" : "movie";
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<FeedRow>>(null);
  const navigation = useNavigation();

  // Tapping the Home tab again jumps the feed back to the top.
  useEffect(() => {
    const unsub = (navigation as any).addListener("tabPress", () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsub;
  }, [navigation]);

  // Reactions for every visible feed item, fetched in one batch.
  const targetIds = (data ?? []).map((r) => r.item.id);
  const reactions = useQuery({
    queryKey: ["reactions", targetIds.join(",")],
    enabled: targetIds.length > 0,
    queryFn: () => getReactions(targetIds),
  });
  const reactionMap = reactions.data ?? {};

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["feed"] }),
      qc.invalidateQueries({ queryKey: ["library"] }),
      qc.invalidateQueries({ queryKey: ["for-you"] }),
      qc.invalidateQueries({ queryKey: ["home-trending"] }),
      qc.invalidateQueries({ queryKey: ["together-compat"] }),
      qc.invalidateQueries({ queryKey: ["reactions"] }),
      qc.invalidateQueries({ queryKey: ["incoming-requests"] }),
      qc.invalidateQueries({ queryKey: ["received-recs"] }),
    ]);
    setRefreshing(false);
  }

  // Branded "c drawing itself" loader — appears only once the feed has been
  // loading long enough to warrant it, so fast loads don't flash it.
  if (isLoading) return <CDrawLoader delay={450} />;

  return (
    <FlatList
      ref={listRef}
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={data ?? []}
      keyExtractor={(r) => r.item.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <TonightHero mediaType={heroMedia} />
          <BlendTeaser />
          <ForYouRail mediaType="movie" heading={t("home.moviesForYou")} skipFirst={heroMedia === "movie"} />
          <Text style={styles.sectionHeading}>{t("home.activity")}</Text>
        </View>
      }
      ListFooterComponent={
        <View>
          <ForYouRail mediaType="tv" heading={t("home.showsForYou")} skipFirst={heroMedia === "tv"} />
          <TrendingRow />
        </View>
      }
      ListEmptyComponent={
        isError ? (
          <View style={styles.feedEmpty}>
            <Text style={styles.feedEmptyEmoji}>📡</Text>
            <Text style={styles.feedEmptyText}>{t("add.errorHint")}</Text>
            <Pressable style={styles.feedEmptyBtn} onPress={onRefresh}>
              <Text style={styles.feedEmptyBtnText}>{t("add.tryAgain")}</Text>
            </Pressable>
          </View>
        ) : (
        <View style={styles.feedEmpty}>
          <Text style={styles.feedEmptyEmoji}>🍿</Text>
          <Text style={styles.feedEmptyText}>{t("home.noActivity")}</Text>
          <Pressable style={styles.feedEmptyBtn} onPress={() => router.push("/friends/add")}>
            <Text style={styles.feedEmptyBtnText}>{t("profile.addFriend")}</Text>
          </Pressable>
        </View>
        )
      }
      renderItem={({ item: row }) => {
        if (row.item.kind === "watchlist") {
          const e = row.item.entry;
          return (
            <View style={styles.card}>
              <FeedCardHeader username={row.username} verb={t(VERB_KEY[e.status])} at={row.item.at} />
              <Pressable style={styles.cardBody} onPress={() => router.push(`/title/${e.media_type}/${e.tmdb_id}`)}>
                <PosterImage path={e.poster_path} width={48} height={72} radius={8} />
                <View style={styles.meta}>
                  <Text style={styles.title} numberOfLines={2}>{e.title}</Text>
                  <Text style={styles.pill}>{e.media_type === "movie" ? t("media.movie") : t("media.tv")}</Text>
                </View>
              </Pressable>
              <FeedReactions targetId={row.item.id} targetOwner={row.item.userId} summary={reactionMap[row.item.id]} />
            </View>
          );
        }
        const rec = row.item.rec;
        return (
          <View style={styles.card}>
            <FeedCardHeader username={row.username} verb={t("feed.recommends")} at={row.item.at} />
            <Pressable style={styles.cardBody} onPress={() => router.push(`/title/${rec.media_type}/${rec.tmdb_id}`)}>
              <PosterImage path={rec.poster_path} width={48} height={72} radius={8} />
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={2}>{rec.title}</Text>
                {rec.note ? <Text style={styles.note} numberOfLines={2}>“{rec.note}”</Text> : null}
                <Text style={styles.pill}>{rec.media_type === "movie" ? t("media.movie") : t("media.tv")}</Text>
              </View>
            </Pressable>
            <FeedReactions targetId={row.item.id} targetOwner={row.item.userId} summary={reactionMap[row.item.id]} />
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  hero: { backgroundColor: "#f7f8ff", borderWidth: 1.5, borderColor: "#eef0ff", borderRadius: 18, padding: 14, marginBottom: 14 },
  heroClose: { position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  heroLabel: { fontSize: 11, fontWeight: "800", color: "#5b6cff", letterSpacing: 0.5, marginBottom: 10 },
  heroBody: { flexDirection: "row", gap: 14, alignItems: "center" },
  heroMeta: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontWeight: "800" },
  heroType: { fontSize: 12, color: "#888", marginTop: 6 },
  heroTag: { alignSelf: "flex-start", backgroundColor: "#eef0ff", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  heroTagText: { fontSize: 11, fontWeight: "800", color: "#5b6cff" },

  teaser: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f6f6f8", borderRadius: 14, padding: 12, marginBottom: 14 },
  teaserAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  teaserAvatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  teaserName: { fontSize: 15, fontWeight: "700" },
  teaserSub: { fontSize: 11, color: "#999", fontWeight: "600", marginTop: 1 },
  teaserPct: { fontSize: 17, fontWeight: "900" },
  teaserChevron: { fontSize: 22, color: "#ccc" },

  rail: { marginBottom: 8 },
  greeting: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 14 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 10 },
  railRow: { gap: 12, paddingBottom: 4, paddingRight: 8 },
  suggestion: { width: 104 },
  suggestionTitle: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  posterAdd: { position: "absolute", bottom: 8, left: 0, right: 0, alignItems: "center" },
  hideBtn: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  card: { backgroundColor: "#f7f7f9", borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cardAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardAvatarText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  cardHeadText: { flex: 1, fontSize: 13 },
  name: { fontWeight: "800" },
  verb: { color: "#888" },
  time: { color: "#bbb", fontWeight: "600" },
  cardBody: { flexDirection: "row", gap: 12, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "700" },
  note: { fontSize: 12, color: "#888", marginTop: 3, fontStyle: "italic" },
  pill: { alignSelf: "flex-start", marginTop: 4, fontSize: 9, color: "#5b6cff", backgroundColor: "#eef0ff", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: "hidden" },
  msg: { color: "#888", fontSize: 13, marginTop: 24, textAlign: "center" },
  feedEmpty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 24 },
  feedEmptyEmoji: { fontSize: 40, marginBottom: 12 },
  feedEmptyText: { color: "#888", fontSize: 14, textAlign: "center", lineHeight: 20 },
  feedEmptyBtn: { backgroundColor: "#5b6cff", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
  feedEmptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
