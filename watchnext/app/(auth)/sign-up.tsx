import { useState } from "react";
import { Link, router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/services/supabase";
import { useI18n } from "../../src/i18n/I18nProvider";
import { ACCENT, HEADING } from "../../src/theme";

export default function SignUp() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    if (!agreed) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) return Alert.alert(t("auth.signUpFailed"), error.message);
    // With email confirmation enabled there's no session yet — confirm via the
    // emailed link first. With it disabled, a session is returned and we continue.
    if (!data.session) {
      return Alert.alert(t("auth.confirmEmailTitle"), t("auth.confirmEmailBody"), [
        { text: t("common.ok"), onPress: () => router.replace("/(auth)/sign-in") },
      ]);
    }
    router.replace("/onboarding/username");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Ionicons name="film-outline" size={30} color="#fff" />
          </View>
          <Text style={styles.title}>{t("auth.createAccount")}</Text>
          <Text style={styles.subtitle}>{t("auth.createAccountSub")}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.emailLabel")}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={17} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#bbb"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t("auth.createPasswordPlaceholder")}
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
            </View>
          </View>

          <View style={styles.agreeRow}>
            <Pressable
              onPress={() => setAgreed((a) => !a)}
              hitSlop={8}
              style={[styles.checkbox, agreed && styles.checkboxOn]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
            >
              {agreed ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </Pressable>
            <Text style={styles.agreeText}>
              {t("auth.agreePrefix")}{" "}
              <Text style={styles.agreeLink} onPress={() => router.push("/legal/terms")}>{t("auth.termsOfUse")}</Text>
              {" "}{t("auth.and")}{" "}
              <Text style={styles.agreeLink} onPress={() => router.push("/legal/privacy")}>{t("auth.privacyPolicy")}</Text>
            </Text>
          </View>

          <Pressable
            style={[styles.signUpBtn, (busy || !agreed) && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={busy || !agreed}
          >
            <Text style={styles.signUpText}>{busy ? "…" : t("auth.signUp")}</Text>
          </Pressable>
        </View>

        <View style={styles.signinRow}>
          <Text style={styles.signinMuted}>{t("auth.haveAccountShort")} </Text>
          <Link href="/(auth)/sign-in" style={styles.signinLink}>
            {t("auth.signIn")}
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },

  logoWrap: { alignItems: "center", marginBottom: 32 },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 26, fontFamily: HEADING, color: "#111", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 4 },

  form: { gap: 16 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "700", color: "#333" },

  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f6f6f8", borderWidth: 1, borderColor: "#ececef", borderRadius: 12, paddingHorizontal: 12, height: 50 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: "#111", padding: 0 },

  agreeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#ccced6", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  agreeText: { flex: 1, fontSize: 13, color: "#777", lineHeight: 19 },
  agreeLink: { color: ACCENT, fontWeight: "700" },

  signUpBtn: { backgroundColor: ACCENT, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center", marginTop: 4 },
  signUpText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnDisabled: { opacity: 0.5 },

  signinRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 32 },
  signinMuted: { fontSize: 14, color: "#888" },
  signinLink: { fontSize: 14, fontWeight: "800", color: ACCENT },
});
