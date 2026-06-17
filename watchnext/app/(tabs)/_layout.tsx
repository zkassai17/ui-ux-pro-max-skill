import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EnvelopeButton } from "../../src/components/EnvelopeButton";
import { useI18n } from "../../src/i18n/I18nProvider";

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="for-you"
        options={{
          title: t("tab.home"),
          headerRight: () => <EnvelopeButton />,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: t("tab.library"),
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: t("tab.add"),
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tab.profile"),
          headerRight: () => <EnvelopeButton />,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
