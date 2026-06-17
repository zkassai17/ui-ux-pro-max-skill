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
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    const username = normalizeUsername(value);
    if (!isValidUsername(username)) {
      return Alert.alert("Invalid username", "3–20 chars, start with a letter, letters/numbers/underscore only.");
    }
    const firstName = first.trim();
    const lastName = last.trim();
    if (!firstName || !lastName) {
      return Alert.alert("Name required", "Enter your first and last name so friends can find you.");
    }
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").insert({
      id: session.user.id,
      username,
      first_name: firstName,
      last_name: lastName,
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

  const inputStyle = { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 } as const;

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>Set up your profile</Text>
      <Text style={{ color: "#666" }}>Your name and username help friends find you.</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput placeholder="First name" autoCapitalize="words" value={first} onChangeText={setFirst}
          style={[inputStyle, { flex: 1 }]} />
        <TextInput placeholder="Last name" autoCapitalize="words" value={last} onChangeText={setLast}
          style={[inputStyle, { flex: 1 }]} />
      </View>
      <TextInput placeholder="username" autoCapitalize="none" autoCorrect={false}
        value={value} onChangeText={setValue} style={inputStyle} />
      <Button title={busy ? "…" : "Continue"} onPress={handleSave} disabled={busy} />
    </View>
  );
}
