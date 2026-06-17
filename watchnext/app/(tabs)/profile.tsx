import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../src/auth/AuthProvider";
import { useI18n } from "../../src/i18n/I18nProvider";
import { getFriends, getFriendStats, type StatBucket } from "../../src/services/friends";
import { fullName } from "../../src/types/db";
import { getLibrary } from "../../src/services/watchlist";
import { computeTasteMatch } from "../../src/lib/tasteMatchLogic";
import { selectFavorites, topDecade } from "../../src/lib/profileInsights";
import { getTopGenre } from "../../src/services/topGenre";
import { initials, avatarColor, matchColor } from "../../src/lib/avatar";
import { PosterImage } from "../../src/components/PosterImage";

export default function ProfileScreen() {
  const { profile, session } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const uid = session?.user.id;
  const [refreshing, setRefreshing] = useState(false);
  const [friendQuery, setFriendQuery] = useState("");
  // Auto-scroll the friends search up to the top when focused so the keyboard
  // doesn't cover the box or its results.
  const listRef = useRef<FlatList>(null);
  const friendsY = useRef(0);

  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const stats = useQuery({
    queryKey: ["my-stats", uid],
    queryFn: () => getFriendStats(uid as string),
    enabled: !!uid,
  });
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });

  const lib = library.data ?? [];
  const favorites = selectFavorites(lib, 12);
  const decade = topDecade(lib);
  const libHash = lib.map((e) => `${e.media_type}:${e.tmdb_id}`).join(",");
  const topGenreQuery = useQuery({
    queryKey: ["profile-top-genre", libHash],
    enabled: !library.isLoading && lib.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: () => getTopGenre(lib),
  });

  // Taste-match % per friend (load each friend's library, score against mine).
  const allFriends = friends.data ?? [];
  const friendIds = allFriends.map((f) => f.id);
  const compat = useQuery({
    queryKey: ["profile-friend-compat", friendIds.join(",")],
    enabled: friendIds.length > 0 && !library.isLoading,
    queryFn: async () => {
      const mine = library.data ?? (await getLibrary());
      const libs = await Promise.all(friendIds.map((id) => getLibrary(id).catch(() => [])));
      const map: Record<string, number | null> = {};
      friendIds.forEach((id, i) => (map[id] = computeTasteMatch(mine, libs[i]).score));
      return map;
    },
  });

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["friends"] }),
      qc.invalidateQueries({ queryKey: ["my-stats", uid] }),
      qc.invalidateQueries({ queryKey: ["library"] }),
      qc.invalidateQueries({ queryKey: ["incoming-requests"] }),
      qc.invalidateQueries({ queryKey: ["received-recs"] }),
    ]);
    setRefreshing(false);
  }

  const fq = friendQuery.trim().toLowerCase();
  const visibleFriends = fq
    ? allFriends.filter((f) => `${f.username} ${fullName(f)}`.toLowerCase().includes(fq))
    : allFriends;

  return (
    <FlatList
      ref={listRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      data={visibleFriends}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={styles.friendCol}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(profile?.username)}</Text>
            </View>
            <View style={styles.headerMeta}>
              <Text style={styles.username} numberOfLines={1}>@{profile?.username ?? "you"}</Text>
            </View>
            <Pressable onPress={() => router.push("/settings")} hitSlop={10} style={styles.gear}>
              <Ionicons name="settings-outline" size={24} color="#666" />
            </Pressable>
          </View>

          <View style={styles.breakdownRow}>
            <BreakdownCard emoji="🎬" label={t("profile.movies")} bucket={stats.data?.movie} />
            <BreakdownCard emoji="📺" label={t("profile.tvShows")} bucket={stats.data?.tv} />
          </View>

          <View style={styles.insightRow}>
            <InsightTile big={topGenreQuery.data ?? (topGenreQuery.isLoading ? "…" : "—")} label={t("profile.topGenre")} />
            <InsightTile big={decade ?? "—"} label={t("profile.topDecade")} />
          </View>

          {favorites.length > 0 ? (
            <View style={styles.favSection}>
              <Text style={styles.section}>{t("profile.favorites")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
                {favorites.map((e) => (
                  <Pressable key={e.id} onPress={() => router.push(`/title/${e.media_type}/${e.tmdb_id}`)}>
                    <PosterImage path={e.poster_path} width={80} height={120} radius={10} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Pressable style={styles.primaryBtn} onPress={() => router.push("/friends/add")}>
            <Text style={styles.primaryBtnText}>{t("profile.addFriend")}</Text>
          </Pressable>

          <View onLayout={(e) => (friendsY.current = e.nativeEvent.layout.y)}>
            <Text style={styles.section}>{t("profile.friends")}</Text>
            {allFriends.length > 0 ? (
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  value={friendQuery}
                  onChangeText={setFriendQuery}
                  onFocus={() =>
                    // friendsY is relative to the header view, which sits below the
                    // list's 16px top padding; bring the box ~near the top.
                    listRef.current?.scrollToOffset({ offset: Math.max(0, friendsY.current + 8), animated: true })
                  }
                  placeholder={t("wt.searchFriends")}
                  placeholderTextColor="#aaa"
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>
            ) : null}
          </View>
          {friends.isLoading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
        </View>
      }
      renderItem={({ item }) => {
        const score = compat.data?.[item.id];
        return (
          <Pressable style={styles.friendCard} onPress={() => router.push(`/user/${item.id}`)}>
            <View style={[styles.friendCardAvatar, { backgroundColor: avatarColor(item.username) }]}>
              <Text style={styles.friendCardAvatarText}>{initials(item.username)}</Text>
            </View>
            {fullName(item) ? (
              <>
                <Text style={styles.friendCardName} numberOfLines={1}>{fullName(item)}</Text>
                <Text style={styles.friendCardUser} numberOfLines={1}>@{item.username}</Text>
              </>
            ) : (
              <Text style={styles.friendCardName} numberOfLines={1}>@{item.username}</Text>
            )}
            {score != null ? (
              <Text style={[styles.friendCardMatch, { color: matchColor(score) }]}>{score}% {t("wt.match")}</Text>
            ) : compat.data ? (
              <Text style={styles.friendCardMatchNone}>{t("wt.newMatch")}</Text>
            ) : (
              <Text style={styles.friendCardMatchNone}> </Text>
            )}
          </Pressable>
        );
      }}
      ListEmptyComponent={
        friends.isLoading ? null : fq ? (
          <Text style={styles.noMatch}>{t("wt.noFriendsFound")}</Text>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t("profile.noFriends")}</Text>
            <Text style={styles.emptySub}>{t("profile.noFriendsSub")}</Text>
          </View>
        )
      }
    />
  );
}

function InsightTile({ big, label }: { big: string; label: string }) {
  return (
    <View style={styles.insightTile}>
      <Text style={styles.insightBig} numberOfLines={1} adjustsFontSizeToFit>{big}</Text>
      <Text style={styles.insightLabel}>{label}</Text>
    </View>
  );
}

function BreakdownCard({ emoji, label, bucket }: { emoji: string; label: string; bucket?: StatBucket }) {
  const { t } = useI18n();
  const b = bucket ?? { want: 0, watching: 0, watched: 0 };
  return (
    <View style={styles.breakdownCard}>
      <Text style={styles.breakdownTitle}>{emoji} {label}</Text>
      <Text style={styles.breakdownBig}>{b.watched}</Text>
      <Text style={styles.breakdownSub}>{t("stat.watched")}</Text>
      <Text style={styles.breakdownMeta}>{b.watching} {t("stat.watching")} · {b.want} {t("stat.want")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  gear: { padding: 2 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#5b6cff", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerMeta: { flex: 1, minWidth: 0 },
  username: { fontSize: 22, fontWeight: "700" },

  breakdownRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  breakdownCard: { flex: 1, backgroundColor: "#f0f0f3", borderRadius: 14, padding: 14 },
  breakdownTitle: { fontSize: 13, fontWeight: "700" },
  breakdownBig: { fontSize: 26, fontWeight: "800", marginTop: 8 },
  breakdownSub: { fontSize: 11, color: "#888", marginTop: -2 },
  breakdownMeta: { fontSize: 11, color: "#aaa", marginTop: 6 },

  insightRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  insightTile: { flex: 1, backgroundColor: "#eef0ff", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6, alignItems: "center" },
  insightBig: { fontSize: 18, fontWeight: "800", color: "#3a45c4" },
  insightLabel: { fontSize: 10, color: "#7a82c0", marginTop: 3, textAlign: "center" },
  favSection: { marginTop: 20 },
  favRow: { gap: 10, paddingRight: 8 },

  primaryBtn: { backgroundColor: "#5b6cff", borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 20 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  section: { fontSize: 13, fontWeight: "700", marginTop: 26, marginBottom: 6 },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f3", borderRadius: 12, paddingHorizontal: 12, height: 40, marginTop: 4, marginBottom: 12 },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 15, color: "#111", padding: 0 },
  noMatch: { textAlign: "center", color: "#888", fontSize: 13, marginTop: 8 },

  friendCol: { justifyContent: "space-between" },
  friendCard: { width: "48.5%", backgroundColor: "#f6f6f8", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 10, alignItems: "center", marginBottom: 10 },
  friendCardAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  friendCardAvatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  friendCardName: { fontSize: 14, fontWeight: "700", marginTop: 8, maxWidth: "100%" },
  friendCardUser: { fontSize: 11, color: "#999", fontWeight: "600", marginTop: 1 },
  friendCardMatch: { fontSize: 11, fontWeight: "800", marginTop: 3 },
  friendCardMatchNone: { fontSize: 11, color: "#bbb", fontWeight: "600", marginTop: 3 },

  empty: { paddingVertical: 20, alignItems: "center" },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#666" },
  emptySub: { fontSize: 12, color: "#aaa", marginTop: 4 },
});
