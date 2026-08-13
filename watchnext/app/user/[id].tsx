import { useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../src/services/supabase";
import { getFriendStats, unfriend } from "../../src/services/friends";
import { blockUser, reportUser } from "../../src/services/account";
import { getLibrary } from "../../src/services/watchlist";
import { friendshipWith } from "../../src/lib/friendsLogic";
import { computeTasteMatch } from "../../src/lib/tasteMatchLogic";
import { TitleRow } from "../../src/components/TitleRow";
import { TasteMatchCard } from "../../src/components/TasteMatchCard";
import { useI18n } from "../../src/i18n/I18nProvider";
import { fullName, type Friendship, type Profile, type WatchStatus } from "../../src/types/db";

import { HEADING } from "../../src/theme";
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

const TAB_KEYS: WatchStatus[] = ["watched", "watching", "want"];

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<WatchStatus>("watched");

  const [refreshing, setRefreshing] = useState(false);

  // A friend's library/stats change on their device, not ours — so the cache here
  // goes stale silently (RN has no window-focus refetch). Always pull fresh on mount,
  // and offer pull-to-refresh, so we never show their old status.
  const profile = useQuery({ queryKey: ["profile", id], queryFn: () => getProfile(id) });
  const stats = useQuery({
    queryKey: ["friend-stats", id],
    queryFn: () => getFriendStats(id),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const library = useQuery({
    queryKey: ["friend-library", id],
    queryFn: () => getLibrary(id),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const myLibrary = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const friendships = useQuery({ queryKey: ["friendships-raw"], queryFn: getMyFriendships });

  const rows = (library.data ?? []).filter((e) => e.status === tab);
  const tasteMatch = computeTasteMatch(myLibrary.data ?? [], library.data ?? []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["friend-library", id] }),
      qc.invalidateQueries({ queryKey: ["friend-stats", id] }),
      qc.invalidateQueries({ queryKey: ["profile", id] }),
      qc.invalidateQueries({ queryKey: ["library"] }),
    ]);
    setRefreshing(false);
  }

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
      Alert.alert(t("alert.cantUnfriend"), (e as Error).message);
    }
  }

  function doBlock() {
    Alert.alert(t("user.blockTitle"), t("user.blockBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("user.block"),
        style: "destructive",
        onPress: async () => {
          try {
            await blockUser(id);
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["friends"] }),
              qc.invalidateQueries({ queryKey: ["feed"] }),
            ]);
            router.back();
          } catch (e) {
            Alert.alert(t("alert.cantBlock"), (e as Error).message);
          }
        },
      },
    ]);
  }

  function doReport() {
    const submit = (reason: string) => async () => {
      try {
        await reportUser(id, reason);
        Alert.alert(t("user.reportThanks"));
      } catch (e) {
        Alert.alert(t("alert.cantReport"), (e as Error).message);
      }
    };
    Alert.alert(t("user.reportTitle"), t("user.reportBody"), [
      { text: t("report.harassment"), onPress: submit("harassment") },
      { text: t("report.inappropriate"), onPress: submit("inappropriate") },
      { text: t("report.spam"), onPress: submit("spam") },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: profile.data ? `@${profile.data.username}` : t("user.profileFallback") }} />
      {profile.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <>
          {profile.data && fullName(profile.data) ? (
            <View style={styles.nameWrap}>
              <Text style={styles.nameText} numberOfLines={1}>{fullName(profile.data)}</Text>
              <Text style={styles.handleText} numberOfLines={1}>@{profile.data.username}</Text>
            </View>
          ) : null}

          <View style={styles.statRow}>
            <Stat n={stats.data?.watched ?? 0} label={t("stat.watched")} />
            <Stat n={stats.data?.watching ?? 0} label={t("stat.watching")} />
            <Stat n={stats.data?.want ?? 0} label={t("stat.want")} />
          </View>

          <View style={styles.btnRow}>
            <Pressable
              style={styles.btn}
              onPress={() => router.push(`/recommend/picker?to=${id}`)}
            >
              <Text style={styles.btnText}>{t("user.recommendTitle")}</Text>
            </Pressable>
            <Pressable style={styles.ghost} onPress={doUnfriend}>
              <Text style={styles.ghostText}>{t("user.unfriend")}</Text>
            </Pressable>
          </View>

          <View style={styles.modRow}>
            <Pressable onPress={doBlock} hitSlop={8}>
              <Text style={styles.modText}>{t("user.block")}</Text>
            </Pressable>
            <Pressable onPress={doReport} hitSlop={8}>
              <Text style={styles.modText}>{t("user.report")}</Text>
            </Pressable>
          </View>

          {!myLibrary.isLoading && !library.isLoading ? (
            <>
              <TasteMatchCard match={tasteMatch} username={profile.data?.username} />
              <Pressable style={styles.blendBtn} onPress={() => router.push(`/blend/${id}`)}>
                <Text style={styles.blendBtnText}>{t("blend.openBlend")}</Text>
              </Pressable>
            </>
          ) : null}

          <View style={styles.tabs}>
            {TAB_KEYS.map((key) => (
              <Pressable key={key} style={[styles.chip, tab === key && styles.chipOn]} onPress={() => setTab(key)}>
                <Text style={[styles.chipText, tab === key && styles.chipTextOn]}>{t(`status.${key}`)}</Text>
              </Pressable>
            ))}
          </View>

          {library.isLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} />
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(e) => e.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={<Text style={styles.msg}>{t("user.nothingIn")} “{t(`status.${tab}`)}”.</Text>}
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
  blendBtn: { backgroundColor: "#5b6cff", borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 12 },
  blendBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  modRow: { flexDirection: "row", gap: 22, marginTop: 12 },
  modText: { color: "#c0392b", fontSize: 13, fontWeight: "600" },
  nameWrap: { marginBottom: 14 },
  nameText: { fontFamily: HEADING, fontSize: 22, fontWeight: "800" },
  handleText: { fontSize: 14, color: "#888", fontWeight: "600", marginTop: 1 },
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
