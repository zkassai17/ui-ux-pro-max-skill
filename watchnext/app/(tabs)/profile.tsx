import { Button, Text, View } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";

export default function Profile() {
  const { profile, signOut } = useAuth();
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>@{profile?.username}</Text>
      <Text style={{ color: "#666" }}>Friend code: {profile?.friend_code}</Text>
      <Text style={{ color: "#666" }}>Private account: {profile?.is_private ? "On" : "Off"}</Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}
