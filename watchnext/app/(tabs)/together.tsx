import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFriends, getIncomingRequests } from "../../src/services/friends";
import { getLibrary } from "../../src/services/watchlist";
import { computeTasteMatch } from "../../src/lib/tasteMatchLogic";
import { initials, avatarColor, matchColor } from "../../src/lib/avatar";
import { fullName } from "../../src/types/db";
import { useI18n } from "../../src/i18n/I18nProvider";
import { usePro } from "../../src/pro/ProProvider";
import { isBlendLocked, canAddFriend } from "../../src/lib/proGates";

export default function TogetherScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useI18n();
  const { isPro } = usePro();
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");

  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const requests = useQuery({ queryKey: ["incoming-requests"], queryFn: getIncomingRequests });
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

  // Friends ranked by taste-match (best blends first; unscored last).
  const ranked = [...allFriends].sort((a, b) => {
    const sa = compat.data?.[a.id] ?? -1;
    const sb = compat.data?.[b.id] ?? -1;
    return sb - sa;
  });
  const fq = q.trim().toLowerCase();
  const shown = fq
    ? ranked.filter((f) => `${f.username} ${fullName(f)}`.toLowerCase().includes(fq))
    : ranked;
  const requestCount = requests.data?.length ?? 0;

  // Blend gating: free users unlock their top-N best matches; the rest are locked.
  // Locking is by true match-rank (position in `ranked`), not filtered position.
  const lockedIds = new Set(
    ranked.filter((_, i) => isBlendLocked(isPro, i)).map((f) => f.id)
  );
  const atFriendCap = !canAddFriend(isPro, allFriends.length);

  function openBlend(id: string) {
    if (lockedIds.has(id)) router.push("/paywall");
    else router.push(`/blend/${id}`);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["friends"] }),
      qc.invalidateQueries({ queryKey: ["library"] }),
      qc.invalidateQueries({ queryKey: ["together-compat"] }),
      qc.invalidateQueries({ queryKey: ["incoming-requests"] }),
    ]);
    setRefreshing(false);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
      data={shown}
      keyExtractor={(f) => f.id}
      ListHeaderComponent={
        <View>
          {/* Pending friend requests */}
          {requestCount > 0 ? (
            <Pressable style={styles.requestBanner} onPress={() => router.push("/requests")}>
              <Text style={styles.requestText}>{requestCount} · {t("together.newRequests")}</Text>
              <Text style={styles.requestArrow}>→</Text>
            </Pressable>
          ) : null}

          {/* Group flow */}
          <Pressable style={styles.groupCard} onPress={() => router.push("/watch-together")}>
            <Text style={styles.groupTitle}>{t("home.whatToWatch")}</Text>
            <Text style={styles.groupSub}>{t("home.whatToWatchSub")}</Text>
          </Pressable>

          <Pressable
            style={styles.addFriendBtn}
            onPress={() => router.push(atFriendCap ? "/paywall" : "/friends/add")}
          >
            <Text style={styles.addFriendBtnText}>＋ {t("profile.addFriend")}</Text>
          </Pressable>

          <Text style={styles.section}>{t("together.yourBlends")}</Text>
          {allFriends.length > 0 ? (
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={q}
                onChangeText={setQ}
                placeholder={t("wt.searchFriends")}
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          ) : null}
          {friends.isLoading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
        </View>
      }
      renderItem={({ item }) => {
        const score = compat.data?.[item.id];
        const locked = lockedIds.has(item.id);
        return (
          <Pressable style={styles.row} onPress={() => openBlend(item.id)}>
            <View style={[styles.avatar, { backgroundColor: avatarColor(item.username) }]}>
              <Text style={styles.avatarText}>{initials(item.username)}</Text>
            </View>
            <View style={styles.meta}>
              {fullName(item) ? (
                <>
                  <Text style={styles.name} numberOfLines={1}>{fullName(item)}</Text>
                  <Text style={styles.handle} numberOfLines={1}>@{item.username}</Text>
                </>
              ) : (
                <Text style={styles.name} numberOfLines={1}>@{item.username}</Text>
              )}
            </View>
            {score != null ? (
              <View style={styles.matchWrap}>
                <Text style={[styles.matchPct, { color: matchColor(score) }]}>{score}%</Text>
                <Text style={styles.matchLabel}>{t("wt.match")}</Text>
              </View>
            ) : compat.data ? (
              <Text style={styles.newMatch}>{t("wt.newMatch")}</Text>
            ) : null}
            {locked ? <Text style={styles.lock}>🔒</Text> : <Text style={styles.chevron}>›</Text>}
          </Pressable>
        );
      }}
      ListEmptyComponent={
        friends.isLoading ? null : friends.isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptySub}>{t("add.errorHint")}</Text>
            <Pressable style={styles.addBtn} onPress={onRefresh}>
              <Text style={styles.addBtnText}>{t("add.tryAgain")}</Text>
            </Pressable>
          </View>
        ) : fq ? (
          <Text style={styles.noMatch}>{t("wt.noFriendsFound")}</Text>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧬</Text>
            <Text style={styles.emptyText}>{t("profile.noFriends")}</Text>
            <Text style={styles.emptySub}>{t("profile.noFriendsSub")}</Text>
            <Pressable style={styles.addBtn} onPress={() => router.push("/friends/add")}>
              <Text style={styles.addBtnText}>{t("profile.addFriend")}</Text>
            </Pressable>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },

  groupCard: { backgroundColor: "#5b6cff", borderRadius: 16, padding: 16, marginBottom: 6 },
  groupTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  groupSub: { color: "#dfe3ff", fontSize: 12, marginTop: 6, lineHeight: 17 },

  addFriendBtn: { backgroundColor: "#eef0ff", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  addFriendBtnText: { color: "#5b6cff", fontWeight: "700", fontSize: 14 },

  requestBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff4e6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  requestText: { color: "#b9690e", fontSize: 13, fontWeight: "700" },
  requestArrow: { color: "#b9690e", fontSize: 16, fontWeight: "700" },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f3", borderRadius: 12, paddingHorizontal: 12, height: 40, marginTop: 4, marginBottom: 8 },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 15, color: "#111", padding: 0 },
  noMatch: { textAlign: "center", color: "#888", fontSize: 13, marginTop: 8 },

  section: { fontSize: 13, fontWeight: "700", color: "#888", marginTop: 22, marginBottom: 6 },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  meta: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "700" },
  handle: { fontSize: 12, color: "#999", fontWeight: "600", marginTop: 1 },
  matchWrap: { alignItems: "flex-end" },
  matchPct: { fontSize: 17, fontWeight: "900" },
  matchLabel: { fontSize: 10, color: "#aaa", fontWeight: "600", marginTop: -2 },
  newMatch: { fontSize: 12, color: "#bbb", fontWeight: "600" },
  chevron: { fontSize: 22, color: "#ccc", marginLeft: 4 },
  lock: { fontSize: 15, marginLeft: 4 },

  empty: { alignItems: "center", marginTop: 32, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: "700", color: "#666" },
  emptySub: { fontSize: 12, color: "#aaa", marginTop: 4, textAlign: "center", lineHeight: 17 },
  addBtn: { backgroundColor: "#5b6cff", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
