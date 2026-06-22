import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../src/auth/AuthProvider";
import { useI18n } from "../../src/i18n/I18nProvider";
import { getFriendStats, type StatBucket } from "../../src/services/friends";
import { fullName } from "../../src/types/db";
import { getLibrary } from "../../src/services/watchlist";
import { selectFavorites, topDecade } from "../../src/lib/profileInsights";
import { getTopGenre } from "../../src/services/topGenre";
import { initials } from "../../src/lib/avatar";
import { PosterImage } from "../../src/components/PosterImage";

export default function ProfileScreen() {
  const { profile, session } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const uid = session?.user.id;
  const [refreshing, setRefreshing] = useState(false);

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

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["my-stats", uid] }),
      qc.invalidateQueries({ queryKey: ["library"] }),
      qc.invalidateQueries({ queryKey: ["incoming-requests"] }),
      qc.invalidateQueries({ queryKey: ["received-recs"] }),
    ]);
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(profile?.username)}</Text>
        </View>
        <View style={styles.headerMeta}>
          {profile && fullName(profile) ? (
            <>
              <Text style={styles.name} numberOfLines={1}>{fullName(profile)}</Text>
              <Text style={styles.usernameSub} numberOfLines={1}>@{profile.username}</Text>
            </>
          ) : (
            <Text style={styles.username} numberOfLines={1}>@{profile?.username ?? "you"}</Text>
          )}
        </View>
        <Pressable onPress={() => router.push("/settings")} hitSlop={10} style={styles.gear}>
          <Ionicons name="settings-outline" size={24} color="#666" />
        </Pressable>
      </View>

      {profile && !fullName(profile) ? (
        <Pressable style={styles.nameBanner} onPress={() => router.push("/settings")}>
          <Text style={styles.nameBannerText}>{t("profile.addNamePrompt")}</Text>
          <Text style={styles.nameBannerArrow}>→</Text>
        </Pressable>
      ) : null}

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
    </ScrollView>
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
  name: { fontSize: 22, fontWeight: "800" },
  usernameSub: { fontSize: 14, color: "#888", fontWeight: "600", marginTop: 1 },

  nameBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#eef0ff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginTop: 16 },
  nameBannerText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#3a45c4" },
  nameBannerArrow: { fontSize: 16, color: "#3a45c4", marginLeft: 8 },

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

  section: { fontSize: 13, fontWeight: "700", marginTop: 26, marginBottom: 6 },
});
