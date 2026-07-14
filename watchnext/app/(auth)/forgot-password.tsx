import { useState } from "react";
import { router } from "expo-router";
import { Alert, Button, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/services/supabase";
import { useI18n } from "../../src/i18n/I18nProvider";

// Two-step password reset that works entirely in-app (no email-link/deep-link):
//   1. Enter email -> Supabase emails a 6-digit recovery code.
//   2. Enter the code + a new password -> verify the code, then set the password.
export default function ForgotPassword() {
  const { t } = useI18n();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const input = { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 } as const;

  async function sendCode() {
    const e = email.trim().toLowerCase();
    if (!e) return Alert.alert(t("auth.resetFailed"), t("auth.enterEmailFirst"));
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(e);
    setBusy(false);
    if (error) return Alert.alert(t("auth.resetFailed"), error.message);
    setStep("verify");
  }

  async function completeReset() {
    const e = email.trim().toLowerCase();
    if (newPassword.length < 6) return Alert.alert(t("auth.resetFailed"), t("auth.passwordTooShort"));
    setBusy(true);
    const { error: vErr } = await supabase.auth.verifyOtp({ email: e, token: code.trim(), type: "recovery" });
    if (vErr) {
      setBusy(false);
      return Alert.alert(t("auth.resetFailed"), vErr.message);
    }
    const { error: uErr } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (uErr) return Alert.alert(t("auth.resetFailed"), uErr.message);
    Alert.alert(t("auth.resetDone"), t("auth.resetDoneBody"));
    router.replace("/");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>{t("auth.resetTitle")}</Text>

      {step === "request" ? (
        <>
          <Text style={{ color: "#666" }}>{t("auth.resetSub")}</Text>
          <TextInput
            placeholder={t("auth.email")}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            style={input}
          />
          <Button title={busy ? "…" : t("auth.sendCode")} onPress={sendCode} disabled={busy} />
        </>
      ) : (
        <>
          <Text style={{ color: "#666" }}>{t("auth.codeSentTo")} {email.trim().toLowerCase()}</Text>
          <TextInput
            placeholder={t("auth.enterCode")}
            keyboardType="number-pad"
            autoCapitalize="none"
            value={code}
            onChangeText={setCode}
            style={input}
          />
          <TextInput
            placeholder={t("auth.newPassword")}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={newPassword}
            onChangeText={setNewPassword}
            style={input}
          />
          <Button title={busy ? "…" : t("auth.resetCta")} onPress={completeReset} disabled={busy} />
          <Pressable onPress={sendCode} disabled={busy} hitSlop={8}>
            <Text style={{ color: "#b9553c", fontWeight: "600", textAlign: "center" }}>{t("auth.resend")}</Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Text style={{ color: "#888", textAlign: "center", marginTop: 8 }}>{t("common.cancel")}</Text>
      </Pressable>
    </View>
  );
}
