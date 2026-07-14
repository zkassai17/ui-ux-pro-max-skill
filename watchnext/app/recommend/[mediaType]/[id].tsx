import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getTitleDetails } from "../../../src/services/tmdb";
import { getFriends } from "../../../src/services/friends";
import { sendRecommendation } from "../../../src/services/recommendations";
import { PosterImage } from "../../../src/components/PosterImage";
import type { MediaType } from "../../../src/types/tmdb";
import { useI18n } from "../../../src/i18n/I18nProvider";

export default function SendRecScreen() {
  const { mediaType, id, to } = useLocalSearchParams<{ mediaType: MediaType; id: string; to?: string }>();
  const tmdbId = Number(id);
  const router = useRouter();
  const { t } = useI18n();
  const [selected, setSelected] = useState<Record<string, boolean>>(to ? { [to]: true } : {});
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const detail = useQuery({
    queryKey: ["tmdb-detail", mediaType, tmdbId],
    queryFn: () => getTitleDetails(mediaType as MediaType, tmdbId),
  });
  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });

  function toggle(friendId: string) {
    setSelected((s) => ({ ...s, [friendId]: !s[friendId] }));
  }

  async function send() {
    const d = detail.data;
    if (!d) return;
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) {
      Alert.alert(t("alert.pickFriend"));
      return;
    }
    try {
      setSending(true);
      for (const friendId of ids) {
        await sendRecommendation(friendId, d, note);
      }
      Alert.alert(t("alert.sent"), t("alert.sentBody"));
      router.back();
    } catch (e) {
      Alert.alert(t("alert.cantSend"), (e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: t("recCompose.title") }} />
      {detail.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : detail.isError ? (
        <Text style={styles.msg}>{(detail.error as Error).message}</Text>
      ) : (
        <>
          <View style={styles.titleRow}>
            <PosterImage path={detail.data!.posterPath} width={70} height={104} radius={10} />
            <View style={styles.titleMeta}>
              <Text style={styles.title}>{detail.data!.title}</Text>
              <Text style={styles.sub}>
                {[detail.data!.year, detail.data!.mediaType === "movie" ? t("media.movie") : t("media.tv")].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>

          <Text style={styles.section}>{t("recCompose.sendTo")}</Text>
          <FlatList
            data={friends.data ?? []}
            keyExtractor={(p) => p.id}
            style={{ flexGrow: 0, maxHeight: 240 }}
            ListEmptyComponent={<Text style={styles.msg}>{t("recCompose.addFriendsFirst")}</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.friendRow} onPress={() => toggle(item.id)}>
                <Text style={styles.friendName}>@{item.username}</Text>
                <View style={[styles.checkbox, selected[item.id] && styles.checkboxOn]} />
              </Pressable>
            )}
          />

          <TextInput
            style={styles.note}
            placeholder={t("recCompose.notePlaceholder")}
            value={note}
            onChangeText={setNote}
          />
          <Pressable style={[styles.btn, sending && { opacity: 0.6 }]} disabled={sending} onPress={send}>
            <Text style={styles.btnText}>{t("recCompose.send")}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  titleRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  titleMeta: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 12, color: "#888", marginTop: 4 },
  section: { fontSize: 11, color: "#888", marginTop: 18, marginBottom: 6, fontWeight: "700" },
  friendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  friendName: { fontSize: 15, fontWeight: "600" },
  checkbox: { width: 18, height: 18, borderRadius: 999, borderWidth: 2, borderColor: "#b9553c" },
  checkboxOn: { backgroundColor: "#b9553c" },
  note: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginTop: 14 },
  btn: { backgroundColor: "#b9553c", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 14 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
