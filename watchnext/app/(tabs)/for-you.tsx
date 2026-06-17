import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getFeed } from "../../src/services/feed";
import { getLibrary } from "../../src/services/watchlist";
import { getForYou } from "../../src/services/forYou";
import { getRecWeights } from "../../src/services/prefs";
import { titleKey } from "../../src/lib/forYouLogic";
import { getReactions } from "../../src/services/reactions";
import { PosterImage } from "../../src/components/PosterImage";
import { QuickAddButton } from "../../src/components/QuickAddButton";
import { FeedReactions } from "../../src/components/FeedReactions";
import { CDrawLoader } from "../../src/components/CDrawLoader";
import { useI18n } from "../../src/i18n/I18nProvider";
import type { Title, MediaType } from "../../src/types/tmdb";
import type { WatchStatus } from "../../src/types/db";

const VERB_KEY: Record<WatchStatus, string> = {
  watched: "feed.finishedWatching",
  watching: "feed.isWatching",
  want: "feed.wantsToWatch",
};

function WatchTogetherCard() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Pressable style={styles.wtCard} onPress={() => router.push("/watch-together")}>
      <Text style={styles.wtTitle}>{t("home.whatToWatch")}</Text>
      <Text style={styles.wtSub}>{t("home.whatToWatchSub")}</Text>
    </Pressable>
  );
}

function ForYouRail({ mediaType, heading }: { mediaType: MediaType; heading: string }) {
  const router = useRouter();
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const recWeights = useQuery({ queryKey: ["rec-weights"], queryFn: getRecWeights });

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

  // Re-filter on every render so a title you just added drops out instantly —
  // before the query has a chance to refetch.
  const titles = (recs.data ?? []).filter((t) => !excludeKeys.has(titleKey(t)));

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
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["feed"], queryFn: getFeed });
  const [refreshing, setRefreshing] = useState(false);

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
      qc.invalidateQueries({ queryKey: ["trending"] }),
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
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={data ?? []}
      keyExtractor={(r) => r.item.id}
      ListHeaderComponent={
        <View>
          <WatchTogetherCard />
          <ForYouRail mediaType="movie" heading={t("home.moviesForYou")} />
          <ForYouRail mediaType="tv" heading={t("home.showsForYou")} />
          <Text style={styles.sectionHeading}>{t("home.activity")}</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.msg}>{t("home.noActivity")}</Text>}
      renderItem={({ item: row }) => {
        const name = row.username ? `@${row.username}` : t("feed.aFriend");
        if (row.item.kind === "watchlist") {
          const e = row.item.entry;
          return (
            <View style={styles.card}>
              <Text style={styles.head}>
                <Text style={styles.name}>{name}</Text> {t(VERB_KEY[e.status])}
              </Text>
              <View style={styles.row}>
                <PosterImage path={e.poster_path} width={42} height={62} />
                <View style={styles.meta}>
                  <Text style={styles.title}>{e.title}</Text>
                  <Text style={styles.pill}>{e.media_type === "movie" ? t("media.movie") : t("media.tv")}</Text>
                </View>
              </View>
              <FeedReactions targetId={row.item.id} targetOwner={row.item.userId} summary={reactionMap[row.item.id]} />
            </View>
          );
        }
        const rec = row.item.rec;
        return (
          <View style={styles.card}>
            <Text style={styles.head}>
              <Text style={styles.name}>{name}</Text> {t("feed.recommends")}
            </Text>
            <View style={styles.row}>
              <PosterImage path={rec.poster_path} width={42} height={62} />
              <View style={styles.meta}>
                <Text style={styles.title}>{rec.title}</Text>
                {rec.note ? <Text style={styles.note}>“{rec.note}”</Text> : null}
                <Text style={styles.pill}>{rec.media_type === "movie" ? t("media.movie") : t("media.tv")}</Text>
              </View>
            </View>
            <FeedReactions targetId={row.item.id} targetOwner={row.item.userId} summary={reactionMap[row.item.id]} />
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wtCard: { backgroundColor: "#5b6cff", borderRadius: 16, padding: 16, marginBottom: 18 },
  wtTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  wtSub: { color: "#dfe3ff", fontSize: 12, marginTop: 6, lineHeight: 17 },
  rail: { marginBottom: 8 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 10 },
  railRow: { gap: 12, paddingBottom: 4, paddingRight: 8 },
  suggestion: { width: 104 },
  suggestionTitle: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  posterAdd: { position: "absolute", bottom: 8, left: 0, right: 0, alignItems: "center" },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 10, marginBottom: 10 },
  head: { fontSize: 12, marginBottom: 8 },
  name: { fontWeight: "700" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "600" },
  note: { fontSize: 11, color: "#888", marginTop: 2 },
  pill: { alignSelf: "flex-start", marginTop: 4, fontSize: 9, color: "#5b6cff", backgroundColor: "#eef0ff", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: "hidden" },
  msg: { color: "#888", fontSize: 13, marginTop: 24, textAlign: "center" },
});
