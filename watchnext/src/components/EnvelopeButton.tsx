import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getIncomingRequests } from "../services/friends";
import { getReceived } from "../services/recommendations";

export function EnvelopeButton() {
  const router = useRouter();
  const requests = useQuery({
    queryKey: ["incoming-requests"],
    queryFn: getIncomingRequests,
    refetchInterval: 20000,
    refetchOnMount: "always",
  });
  const recs = useQuery({
    queryKey: ["received-recs"],
    queryFn: getReceived,
    refetchInterval: 20000,
    refetchOnMount: "always",
  });
  const count = (requests.data?.length ?? 0) + (recs.data?.length ?? 0);
  return (
    <Pressable onPress={() => router.push("/requests")} style={styles.btn} hitSlop={8}>
      <Ionicons name={count > 0 ? "mail" : "mail-outline"} size={22} color="#111" />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { marginRight: 16 },
  badge: { position: "absolute", top: -5, right: -7, backgroundColor: "#ff3b5b", borderRadius: 999, minWidth: 17, height: 17, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5, borderColor: "#fff" },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
