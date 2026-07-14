import { useState } from "react";
import { Link, router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/services/supabase";
import { useI18n } from "../../src/i18n/I18nProvider";
import { ACCENT, HEADING } from "../../src/theme";

export default function SignIn() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) return Alert.alert(t("auth.signInFailed"), error.message);
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {/* Brand mark */}
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Ionicons name="film-outline" size={30} color="#fff" />
          </View>
          <Text style={styles.title}>{t("auth.welcomeBack")}</Text>
          <Text style={styles.subtitle}>{t("auth.signInSub")}</Text>
        </View>

        {/* Form */}
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
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
              <Link href="/(auth)/forgot-password" style={styles.forgot}>
                {t("auth.forgot")}
              </Link>
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
            </View>
          </View>

          <Pressable
            style={[styles.signInBtn, busy && styles.btnDisabled]}
            onPress={handleSignIn}
            disabled={busy}
          >
            <Text style={styles.signInText}>{busy ? "…" : t("auth.signIn")}</Text>
          </Pressable>
        </View>

        {/* Sign up */}
        <View style={styles.signupRow}>
          <Text style={styles.signupMuted}>{t("auth.noAccount")} </Text>
          <Link href="/(auth)/sign-up" style={styles.signupLink}>
            {t("auth.signUp")}
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
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13, fontWeight: "700", color: "#333" },
  forgot: { fontSize: 13, fontWeight: "700", color: ACCENT },

  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f6f6f8", borderWidth: 1, borderColor: "#ececef", borderRadius: 12, paddingHorizontal: 12, height: 50 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: "#111", padding: 0 },

  signInBtn: { backgroundColor: ACCENT, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center", marginTop: 4 },
  signInText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnDisabled: { opacity: 0.5 },

  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 32 },
  signupMuted: { fontSize: 14, color: "#888" },
  signupLink: { fontSize: 14, fontWeight: "800", color: ACCENT },
});
