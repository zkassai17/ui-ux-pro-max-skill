import { View, Text, StyleSheet, Pressable, Share } from "react-native";
import { Stack } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../src/auth/AuthProvider";
import { useI18n } from "../src/i18n/I18nProvider";
import { fullName } from "../src/types/db";
import { initials } from "../src/lib/avatar";

import { HEADING } from "../src/theme";
// The QR encodes a deep link into the add-friend flow with the code prefilled, so
// a friend who scans it (in the installed app) lands ready to add you. The code is
// also shown in text as a fallback for manual entry.
export default function QrScreen() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const code = profile?.friend_code ?? "";
  const deepLink = `watchnext://friends/add?code=${code}`;

  async function share() {
    const message = code ? t("profile.shareText").replace("{code}", code) : t("profile.shareTextNoCode");
    try {
      await Share.share({ message });
    } catch {
      // dismissed
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: t("qr.title") }} />

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(profile?.username)}</Text>
      </View>
      <Text style={styles.name}>{profile && fullName(profile) ? fullName(profile) : `@${profile?.username ?? "you"}`}</Text>
      {profile && fullName(profile) ? <Text style={styles.handle}>@{profile.username}</Text> : null}

      <View style={styles.qrCard}>
        {code ? (
          <QRCode value={deepLink} size={220} backgroundColor="#fff" color="#111" />
        ) : (
          <Text style={styles.noCode}>—</Text>
        )}
      </View>

      <Text style={styles.hint}>{t("qr.hint")}</Text>
      {code ? <Text style={styles.code}>{code}</Text> : null}

      <Pressable style={styles.shareBtn} onPress={share}>
        <Text style={styles.shareBtnText}>{t("qr.share")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", paddingTop: 28, paddingHorizontal: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#5b6cff", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "800" },
  name: { fontFamily: HEADING, fontSize: 20, fontWeight: "800", marginTop: 12 },
  handle: { fontSize: 14, color: "#888", fontWeight: "600", marginTop: 2 },
  qrCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginTop: 24, borderWidth: 1, borderColor: "#eee", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  noCode: { fontSize: 40, color: "#ccc", width: 220, height: 220, textAlign: "center", textAlignVertical: "center" },
  hint: { fontSize: 14, color: "#666", marginTop: 22, textAlign: "center", fontWeight: "600" },
  code: { fontSize: 22, fontWeight: "900", letterSpacing: 3, marginTop: 10, color: "#111" },
  shareBtn: { backgroundColor: "#5b6cff", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 28 },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
