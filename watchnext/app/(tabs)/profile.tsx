import { useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "../../src/auth/AuthProvider";
import { getFriends, getFriendStats, type StatBucket } from "../../src/services/friends";

function initials(username?: string): string {
  if (!username) return "?";
  const cleaned = username.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.slice(0, 2).toUpperCase() || "?";
}

export default function ProfileScreen() {
  const { profile, session } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const uid = session?.user.id;
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const stats = useQuery({
    queryKey: ["my-stats", uid],
    queryFn: () => getFriendStats(uid as string),
    enabled: !!uid,
  });

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["friends"] }),
      qc.invalidateQueries({ queryKey: ["my-stats", uid] }),
      qc.invalidateQueries({ queryKey: ["incoming-requests"] }),
      qc.invalidateQueries({ queryKey: ["received-recs"] }),
    ]);
    setRefreshing(false);
  }

  async function copyCode() {
    if (!profile?.friend_code) return;
    await Clipboard.setStringAsync(profile.friend_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
              {profile?.friend_code ? (
                <Pressable style={styles.codePill} onPress={copyCode} hitSlop={6}>
                  <Text style={styles.codeText}>
                    {copied ? "Copied!" : `${profile.friend_code}  ⧉`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={() => router.push("/settings")} hitSlop={10} style={styles.gear}>
              <Ionicons name="settings-outline" size={24} color="#666" />
            </Pressable>
          </View>

          <View style={styles.statRow}>
            <StatTile n={stats.data?.watched ?? 0} label="watched" />
            <StatTile n={stats.data?.watching ?? 0} label="watching" />
            <StatTile n={stats.data?.want ?? 0} label="want" />
          </View>

          <View style={styles.breakdownRow}>
            <BreakdownCard emoji="🎬" label="Movies" bucket={stats.data?.movie} />
            <BreakdownCard emoji="📺" label="TV Shows" bucket={stats.data?.tv} />
          </View>

          <Pressable style={styles.primaryBtn} onPress={() => router.push("/friends/add")}>
            <Text style={styles.primaryBtnText}>Add a friend</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => router.push("/import")}>
            <Text style={styles.secondaryBtnText}>↓ Import watch history</Text>
          </Pressable>

          <Text style={styles.section}>Friends</Text>
          {friends.isLoading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.friendRow} onPress={() => router.push(`/user/${item.id}`)}>
          <View style={styles.friendAvatar}>
            <Text style={styles.friendAvatarText}>{initials(item.username)}</Text>
          </View>
          <Text style={styles.friendName}>@{item.username}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
      ListEmptyComponent={
        friends.isLoading ? null : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySub}>Add someone with their friend code above.</Text>
          </View>
        )
      }
    />
  );
}

function StatTile({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BreakdownCard({ emoji, label, bucket }: { emoji: string; label: string; bucket?: StatBucket }) {
  const b = bucket ?? { want: 0, watching: 0, watched: 0 };
  return (
    <View style={styles.breakdownCard}>
      <Text style={styles.breakdownTitle}>{emoji} {label}</Text>
      <Text style={styles.breakdownBig}>{b.watched}</Text>
      <Text style={styles.breakdownSub}>watched</Text>
      <Text style={styles.breakdownMeta}>{b.watching} watching · {b.want} want</Text>
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
  codePill: { alignSelf: "flex-start", marginTop: 6, backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  codeText: { fontSize: 12, color: "#666", fontWeight: "600", letterSpacing: 0.5 },

  statRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  statTile: { flex: 1, backgroundColor: "#f0f0f3", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  statN: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 2 },

  breakdownRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  breakdownCard: { flex: 1, backgroundColor: "#f0f0f3", borderRadius: 14, padding: 14 },
  breakdownTitle: { fontSize: 13, fontWeight: "700" },
  breakdownBig: { fontSize: 26, fontWeight: "800", marginTop: 8 },
  breakdownSub: { fontSize: 11, color: "#888", marginTop: -2 },
  breakdownMeta: { fontSize: 11, color: "#aaa", marginTop: 6 },

  primaryBtn: { backgroundColor: "#5b6cff", borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 20 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { borderWidth: 1.5, borderColor: "#dfe1ec", borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 10 },
  secondaryBtnText: { color: "#5b6cff", fontWeight: "600", fontSize: 14 },

  section: { fontSize: 13, fontWeight: "700", marginTop: 26, marginBottom: 6 },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  friendAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eef0ff", alignItems: "center", justifyContent: "center" },
  friendAvatarText: { color: "#5b6cff", fontSize: 13, fontWeight: "700" },
  friendName: { flex: 1, fontSize: 15, fontWeight: "600" },
  chevron: { fontSize: 20, color: "#bbb" },

  empty: { paddingVertical: 20, alignItems: "center" },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#666" },
  emptySub: { fontSize: 12, color: "#aaa", marginTop: 4 },
});
