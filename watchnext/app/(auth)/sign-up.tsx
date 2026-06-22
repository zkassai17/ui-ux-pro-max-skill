import { useState } from "react";
import { Link, router } from "expo-router";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/services/supabase";
import { useI18n } from "../../src/i18n/I18nProvider";

export default function SignUp() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) return Alert.alert(t("auth.signUpFailed"), error.message);
    router.replace("/onboarding/username");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>{t("auth.createAccount")}</Text>
      <TextInput placeholder={t("auth.email")} autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }} />
      <TextInput placeholder={t("auth.password")} secureTextEntry
        autoCapitalize="none" autoCorrect={false} textContentType="newPassword"
        value={password} onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }} />
      <Button title={busy ? "…" : t("auth.signUp")} onPress={handleSignUp} disabled={busy} />
      <Link href="/(auth)/sign-in">{t("auth.haveAccount")}</Link>
    </View>
  );
}
