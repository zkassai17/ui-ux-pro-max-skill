import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../src/auth/AuthProvider";
import { getFriends, getFriendStats, type StatBucket } from "../../src/services/friends";

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();
  const router = useRouter();
  const uid = session?.user.id;

  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const stats = useQuery({
    queryKey: ["my-stats", uid],
    queryFn: () => getFriendStats(uid as string),
    enabled: !!uid,
  });

  return (
    <FlatList
      style={styles.container}
      data={friends.data ?? []}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.username}>@{profile?.username ?? "you"}</Text>
          {profile?.friend_code ? <Text style={styles.code}>Friend code: {profile.friend_code}</Text> : null}

          <View style={styles.statRow}>
            <Stat n={stats.data?.watched ?? 0} label="watched" />
            <Stat n={stats.data?.watching ?? 0} label="watching" />
            <Stat n={stats.data?.want ?? 0} label="want" />
          </View>

          <BreakdownRow label="🎬 Movies" bucket={stats.data?.movie} />
          <BreakdownRow label="📺 TV Shows" bucket={stats.data?.tv} />

          <Pressable style={styles.btn} onPress={() => router.push("/friends/add")}>
            <Text style={styles.btnText}>Add a friend</Text>
          </Pressable>

          <Pressable style={styles.importBtn} onPress={() => router.push("/import")}>
            <Text style={styles.importBtnText}>↓ Import your watch history</Text>
          </Pressable>

          <Text style={styles.section}>Friends</Text>
          {friends.isLoading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.friendRow} onPress={() => router.push(`/user/${item.id}`)}>
          <Text style={styles.friendName}>@{item.username}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
      ListEmptyComponent={
        friends.isLoading ? null : <Text style={styles.msg}>No friends yet. Add someone above.</Text>
      }
      ListFooterComponent={
        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      }
    />
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BreakdownRow({ label, bucket }: { label: string; bucket?: StatBucket }) {
  const b = bucket ?? { want: 0, watching: 0, watched: 0 };
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownText}>
        {b.watched} watched · {b.watching} watching · {b.want} want
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  username: { fontSize: 22, fontWeight: "700" },
  code: { fontSize: 13, color: "#888", marginTop: 4 },
  statRow: { flexDirection: "row", gap: 24, marginTop: 16 },
  stat: { alignItems: "flex-start" },
  statN: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#888" },
  breakdownRow: { marginTop: 12 },
  breakdownLabel: { fontSize: 13, fontWeight: "700" },
  breakdownText: { fontSize: 12, color: "#888", marginTop: 2 },
  btn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 18 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  importBtn: { backgroundColor: "#eef0ff", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 10 },
  importBtnText: { color: "#5b6cff", fontWeight: "700", fontSize: 14 },
  section: { fontSize: 13, fontWeight: "700", marginTop: 22, marginBottom: 6 },
  friendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  friendName: { fontSize: 15, fontWeight: "600" },
  chevron: { fontSize: 20, color: "#bbb" },
  msg: { color: "#888", fontSize: 13, marginTop: 12 },
  signOut: { marginTop: 28, alignItems: "center" },
  signOutText: { color: "#ff3b5b", fontWeight: "600", fontSize: 14 },
});
