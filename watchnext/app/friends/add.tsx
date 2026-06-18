import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { searchUsers, lookupByFriendCode, sendFriendRequest } from "../../src/services/friends";
import { isValidFriendCode } from "../../src/lib/friendCode";
import { fullName, type Profile } from "../../src/types/db";
import { useI18n } from "../../src/i18n/I18nProvider";

type Found = { id: string; username: string; name: string };

export default function AddFriendScreen() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  async function runSearch() {
    const value = q.trim();
    if (!value) return;
    try {
      setBusy(true);
      if (isValidFriendCode(value.toUpperCase())) {
        const u = await lookupByFriendCode(value.toUpperCase());
        setResults(u ? [{ id: u.id, username: u.username, name: fullName(u) }] : []);
      } else {
        const profiles: Profile[] = await searchUsers(value);
        setResults(profiles.map((p) => ({ id: p.id, username: p.username, name: fullName(p) })));
      }
    } catch (e) {
      Alert.alert(t("alert.searchFailed"), (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function send(userId: string) {
    try {
      await sendFriendRequest(userId);
      setSent((s) => ({ ...s, [userId]: true }));
    } catch (e) {
      Alert.alert(t("alert.cantSendRequest"), (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: t("friendsAdd.title") }} />
      <TextInput
        style={styles.input}
        placeholder={t("friendsAdd.placeholder")}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={runSearch}
        returnKeyType="search"
      />
      <Pressable style={styles.btn} onPress={runSearch}>
        <Text style={styles.btnText}>{t("common.search")}</Text>
      </Pressable>

      {busy ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          style={{ marginTop: 16 }}
          data={results}
          keyExtractor={(u) => u.id}
          ListEmptyComponent={<Text style={styles.msg}>{t("friendsAdd.hint")}</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {item.name ? <Text style={styles.name} numberOfLines={1}>{item.name}</Text> : null}
                <Text style={item.name ? styles.usernameSub : styles.username} numberOfLines={1}>@{item.username}</Text>
              </View>
              {sent[item.id] ? (
                <Text style={styles.sentText}>{t("friendsAdd.requested")}</Text>
              ) : (
                <Pressable style={styles.smallBtn} onPress={() => send(item.id)}>
                  <Text style={styles.smallBtnText}>{t("common.add")}</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  name: { fontSize: 15, fontWeight: "700" },
  username: { fontSize: 15, fontWeight: "600" },
  usernameSub: { fontSize: 12, color: "#888", marginTop: 1 },
  smallBtn: { backgroundColor: "#5b6cff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  smallBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  sentText: { color: "#888", fontSize: 12 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
