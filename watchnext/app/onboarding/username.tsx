import { useState } from "react";
import { router } from "expo-router";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/services/supabase";
import { useAuth } from "../../src/auth/AuthProvider";
import { isValidUsername, normalizeUsername } from "../../src/lib/username";
import { generateFriendCode } from "../../src/lib/friendCode";

export default function ChooseUsername() {
  const { session, refreshProfile } = useAuth();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    const username = normalizeUsername(value);
    if (!isValidUsername(username)) {
      return Alert.alert("Invalid username", "3–20 chars, start with a letter, letters/numbers/underscore only.");
    }
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").insert({
      id: session.user.id,
      username,
      friend_code: generateFriendCode(),
    });
    setBusy(false);
    if (error) {
      const msg = error.code === "23505" ? "That username is taken." : error.message;
      return Alert.alert("Could not save", msg);
    }
    await refreshProfile();
    router.replace("/quick-seen?from=onboarding");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>Pick a username</Text>
      <Text style={{ color: "#666" }}>Friends use this to find you.</Text>
      <TextInput placeholder="username" autoCapitalize="none"
        value={value} onChangeText={setValue}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }} />
      <Button title={busy ? "…" : "Continue"} onPress={handleSave} disabled={busy} />
    </View>
  );
}
