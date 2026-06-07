import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="for-you" options={{ title: "For You",
        tabBarIcon: ({ color, size }) => <Ionicons name="star" color={color} size={size} /> }} />
      <Tabs.Screen name="watchlist" options={{ title: "Watchlist",
        tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" color={color} size={size} /> }} />
      <Tabs.Screen name="add" options={{ title: "Add",
        tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} /> }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox",
        tabBarIcon: ({ color, size }) => <Ionicons name="mail" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile",
        tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
