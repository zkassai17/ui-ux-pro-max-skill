import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "../../src/i18n/I18nProvider";
import { getFriends } from "../../src/services/friends";
import { fullName } from "../../src/types/db";
import { getLibrary } from "../../src/services/watchlist";
import { computeTasteMatch } from "../../src/lib/tasteMatchLogic";
import { initials, avatarColor, matchColor } from "../../src/lib/avatar";

export default function FriendsListScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");

  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const allFriends = friends.data ?? [];
  const friendIds = allFriends.map((f) => f.id);

  // Taste-match % per friend, scored against my own library.
  const compat = useQuery({
    queryKey: ["profile-friend-compat", friendIds.join(",")],
    enabled: friendIds.length > 0,
    queryFn: async () => {
      const mine = await getLibrary();
      const libs = await Promise.all(friendIds.map((id) => getLibrary(id).catch(() => [])));
      const map: Record<string, number | null> = {};
      friendIds.forEach((id, i) => (map[id] = computeTasteMatch(mine, libs[i]).score));
      return map;
    },
  });

  const fq = q.trim().toLowerCase();
  const visible = fq
    ? allFriends.filter((f) => `${f.username} ${fullName(f)}`.toLowerCase().includes(fq))
    : allFriends;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: t("profile.friends") }} />
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
          autoFocus
          clearButtonMode="while-editing"
        />
      </View>

      {friends.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={styles.col}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <Text style={styles.empty}>{fq ? t("wt.noFriendsFound") : t("profile.noFriends")}</Text>
          }
          renderItem={({ item }) => {
            const score = compat.data?.[item.id];
            return (
              <Pressable style={styles.card} onPress={() => router.push(`/user/${item.id}`)}>
                <View style={[styles.cardAvatar, { backgroundColor: avatarColor(item.username) }]}>
                  <Text style={styles.cardAvatarText}>{initials(item.username)}</Text>
                </View>
                {fullName(item) ? (
                  <>
                    <Text style={styles.cardName} numberOfLines={1}>{fullName(item)}</Text>
                    <Text style={styles.cardUser} numberOfLines={1}>@{item.username}</Text>
                  </>
                ) : (
                  <Text style={styles.cardName} numberOfLines={1}>@{item.username}</Text>
                )}
                {score != null ? (
                  <Text style={[styles.cardMatch, { color: matchColor(score) }]}>{score}% {t("wt.match")}</Text>
                ) : compat.data ? (
                  <Text style={styles.cardMatchNone}>{t("wt.newMatch")}</Text>
                ) : (
                  <Text style={styles.cardMatchNone}> </Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f3", borderRadius: 12, paddingHorizontal: 12, height: 42, margin: 16 },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 16, color: "#111", padding: 0 },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  col: { justifyContent: "space-between" },
  card: { width: "48.5%", backgroundColor: "#f6f6f8", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 10, alignItems: "center", marginBottom: 10 },
  cardAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cardAvatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  cardName: { fontSize: 14, fontWeight: "700", marginTop: 8, maxWidth: "100%" },
  cardUser: { fontSize: 11, color: "#999", fontWeight: "600", marginTop: 1 },
  cardMatch: { fontSize: 11, fontWeight: "800", marginTop: 3 },
  cardMatchNone: { fontSize: 11, color: "#bbb", fontWeight: "600", marginTop: 3 },

  empty: { textAlign: "center", color: "#888", fontSize: 14, marginTop: 32 },
});
