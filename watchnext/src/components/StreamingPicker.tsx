import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TOP_PROVIDERS } from "../lib/providers";
import { ACCENT } from "../theme";

// A grid of the top streaming services as toggle chips. Shared by the onboarding
// step and the Settings screen; both store the selection via prefs.
export function StreamingPicker({
  selected,
  onToggle,
}: {
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <View style={styles.grid}>
      {TOP_PROVIDERS.map((p) => {
        const on = selected.includes(p.id);
        return (
          <Pressable
            key={p.id}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onToggle(p.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
          >
            <Ionicons
              name={on ? "checkmark-circle" : "add-circle-outline"}
              size={17}
              color={on ? "#fff" : "#b7b7c2"}
              style={styles.icon}
            />
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f4f7",
    borderWidth: 1.5,
    borderColor: "#ececf1",
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 11,
  },
  chipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  icon: { marginRight: 7 },
  chipText: { fontSize: 14, fontWeight: "700", color: "#333" },
  chipTextOn: { color: "#fff" },
});
