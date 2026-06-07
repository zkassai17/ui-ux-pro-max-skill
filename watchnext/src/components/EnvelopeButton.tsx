import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getIncomingRequests } from "../services/friends";
import { getReceived } from "../services/recommendations";

export function EnvelopeButton() {
  const router = useRouter();
  const requests = useQuery({ queryKey: ["incoming-requests"], queryFn: getIncomingRequests });
  const recs = useQuery({ queryKey: ["received-recs"], queryFn: getReceived });
  const count = (requests.data?.length ?? 0) + (recs.data?.length ?? 0);
  return (
    <Pressable onPress={() => router.push("/requests")} style={styles.btn} hitSlop={8}>
      <Ionicons name="mail-outline" size={22} color="#111" />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { marginRight: 16 },
  badge: { position: "absolute", top: -4, right: -6, backgroundColor: "#ff3b5b", borderRadius: 999, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
