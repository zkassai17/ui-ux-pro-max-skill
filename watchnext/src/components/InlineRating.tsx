import { View, Text, Pressable, StyleSheet } from "react-native";
import { RATING_SCALE, ratingLevel } from "../lib/ratingScale";

// Expanded 1–5 emoji picker shown when a library row's rating is tapped open.
// The selected face colors in, scales up, and gets a tinted highlight pill so
// the active rating is unmistakable; the rest dim hard so the strip reads as a
// 1 (Bad) → 5 (Loved it) scale. A label underneath names the current pick.
// Tapping the current rating again clears it. Saves immediately via onRate.
export function InlineRating({
  value,
  onRate,
  disabled,
}: {
  value: number | null;
  onRate: (next: number | null) => void;
  disabled?: boolean;
}) {
  const active = value != null ? ratingLevel(value) : null;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {RATING_SCALE.map((level) => {
          const on = value === level.value;
          return (
            <Pressable
              key={level.value}
              disabled={disabled}
              hitSlop={6}
              style={[styles.face, on && { backgroundColor: `${level.color}22` }]}
              onPress={() => onRate(on ? null : level.value)}
            >
              <Text style={[styles.emoji, on ? styles.emojiOn : styles.emojiOff]}>{level.emoji}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.label, active ? { color: active.color } : styles.labelHint]}>
        {active ? `${active.value} · ${active.label}` : "Tap a face — 1 = Bad, 5 = Loved it"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, alignItems: "flex-start" },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  face: { paddingVertical: 4, paddingHorizontal: 6, borderRadius: 999 },
  emoji: { fontSize: 24 },
  emojiOn: { opacity: 1, transform: [{ scale: 1.15 }] },
  emojiOff: { opacity: 0.22 },
  label: { fontSize: 12, fontWeight: "700", marginLeft: 2 },
  labelHint: { color: "#aaa", fontWeight: "600" },
});
