import { useState } from "react";
import { View, Text, Pressable, FlatList, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../src/auth/AuthProvider";
import { useI18n } from "../../src/i18n/I18nProvider";
import { getFriends, getFriendStats, type StatBucket } from "../../src/services/friends";
import { getLibrary } from "../../src/services/watchlist";
import { selectFavorites, computeProfileInsights } from "../../src/lib/profileInsights";
import { PosterImage } from "../../src/components/PosterImage";

function initials(username?: string): string {
  if (!username) return "?";
  const cleaned = username.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.slice(0, 2).toUpperCase() || "?";
}

// Deterministic avatar color per username so friends are visually distinct.
const AVATAR_COLORS = ["#5b6cff", "#1dd1a1", "#ff9f43", "#ff6b9d", "#a55eea", "#26c6da", "#fd7272"];
function avatarColor(username?: string): string {
  if (!username) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function ProfileScreen() {
  const { profile, session } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const uid = session?.user.id;
  const [refreshing, setRefreshing] = useState(false);

  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const stats = useQuery({
    queryKey: ["my-stats", uid],
    queryFn: () => getFriendStats(uid as string),
    enabled: !!uid,
  });
  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });

  const lib = library.data ?? [];
  const favorites = selectFavorites(lib, 12);
  const insights = computeProfileInsights(lib, new Date().getFullYear());

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

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={friends.data ?? []}
      keyExtractor={(p) => p.id}
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
            <InsightTile big={String(insights.thisYear)} label={t("profile.thisYear")} />
            <InsightTile big={insights.avgRating != null ? `${insights.avgRating}★` : "—"} label={t("profile.avgRating")} />
            <InsightTile big={insights.topDecade ?? "—"} label={t("profile.topDecade")} />
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

          <Text style={styles.section}>{t("profile.friends")}</Text>
          {friends.isLoading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.friendRow} onPress={() => router.push(`/user/${item.id}`)}>
          <View style={[styles.friendAvatar, { backgroundColor: avatarColor(item.username) }]}>
            <Text style={styles.friendAvatarText}>{initials(item.username)}</Text>
          </View>
          <Text style={styles.friendName} numberOfLines={1}>@{item.username}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
      ListEmptyComponent={
        friends.isLoading ? null : (
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
  friendRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f6f6f8", borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 10 },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  friendAvatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  friendName: { flex: 1, fontSize: 16, fontWeight: "700" },
  chevron: { fontSize: 22, color: "#c4c4cc", fontWeight: "600" },

  empty: { paddingVertical: 20, alignItems: "center" },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#666" },
  emptySub: { fontSize: 12, color: "#aaa", marginTop: 4 },
});
