import { useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../src/services/supabase";
import { getFriendStats, unfriend } from "../../src/services/friends";
import { getLibrary } from "../../src/services/watchlist";
import { friendshipWith } from "../../src/lib/friendsLogic";
import { computeTasteMatch } from "../../src/lib/tasteMatchLogic";
import { TitleRow } from "../../src/components/TitleRow";
import { TasteMatchCard } from "../../src/components/TasteMatchCard";
import type { Friendship, Profile, WatchStatus } from "../../src/types/db";

async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

async function getMyFriendships(): Promise<Friendship[]> {
  const { data, error } = await supabase.from("friendships").select("*");
  if (error) throw error;
  return (data as Friendship[]) ?? [];
}

const TABS: { key: WatchStatus; label: string }[] = [
  { key: "watched", label: "Watched" },
  { key: "watching", label: "Watching" },
  { key: "want", label: "Want" },
];

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<WatchStatus>("watched");

  const profile = useQuery({ queryKey: ["profile", id], queryFn: () => getProfile(id) });
  const stats = useQuery({ queryKey: ["friend-stats", id], queryFn: () => getFriendStats(id) });
  const library = useQuery({ queryKey: ["friend-library", id], queryFn: () => getLibrary(id) });
  const myLibrary = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const friendships = useQuery({ queryKey: ["friendships-raw"], queryFn: getMyFriendships });

  const rows = (library.data ?? []).filter((e) => e.status === tab);
  const tasteMatch = computeTasteMatch(myLibrary.data ?? [], library.data ?? []);

  async function doUnfriend() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id ?? "";
      const f = friendshipWith(friendships.data ?? [], me, id);
      if (!f) return;
      await unfriend(f.id);
      await qc.invalidateQueries({ queryKey: ["friends"] });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't unfriend", (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: profile.data ? `@${profile.data.username}` : "Profile" }} />
      {profile.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.statRow}>
            <Stat n={stats.data?.watched ?? 0} label="watched" />
            <Stat n={stats.data?.watching ?? 0} label="watching" />
            <Stat n={stats.data?.want ?? 0} label="want" />
          </View>

          <View style={styles.btnRow}>
            <Pressable
              style={styles.btn}
              onPress={() => router.push(`/recommend/picker?to=${id}`)}
            >
              <Text style={styles.btnText}>Recommend a title</Text>
            </Pressable>
            <Pressable style={styles.ghost} onPress={doUnfriend}>
              <Text style={styles.ghostText}>Unfriend</Text>
            </Pressable>
          </View>

          {!myLibrary.isLoading && !library.isLoading ? (
            <TasteMatchCard match={tasteMatch} username={profile.data?.username} />
          ) : null}

          <View style={styles.tabs}>
            {TABS.map((t) => (
              <Pressable key={t.key} style={[styles.chip, tab === t.key && styles.chipOn]} onPress={() => setTab(t.key)}>
                <Text style={[styles.chipText, tab === t.key && styles.chipTextOn]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {library.isLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} />
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(e) => e.id}
              ListEmptyComponent={<Text style={styles.msg}>Nothing in “{TABS.find((t) => t.key === tab)?.label}”.</Text>}
              renderItem={({ item }) => (
                <TitleRow
                  title={item.title}
                  mediaType={item.media_type}
                  posterPath={item.poster_path}
                  onPress={() => router.push(`/title/${item.media_type}/${item.tmdb_id}`)}
                />
              )}
            />
          )}
        </>
      )}
    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  statRow: { flexDirection: "row", gap: 24 },
  stat: { alignItems: "flex-start" },
  statN: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#888" },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  btn: { flex: 1, backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  ghost: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, alignItems: "center" },
  ghostText: { color: "#333", fontWeight: "600", fontSize: 13 },
  tabs: { flexDirection: "row", gap: 8, marginTop: 18, marginBottom: 12 },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 12, color: "#666" },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
