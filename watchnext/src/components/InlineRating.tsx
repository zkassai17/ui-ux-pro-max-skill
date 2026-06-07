import { View, Text, Pressable, StyleSheet } from "react-native";
import { RATING_SCALE } from "../lib/ratingScale";

// Compact 1–5 emoji strip for list rows. Always visible so titles can be rated
// in bulk without opening each one. The selected face colors in; the rest stay
// faded. Tapping the current rating again clears it. Saves immediately via onRate.
export function InlineRating({
  value,
  onRate,
  disabled,
}: {
  value: number | null;
  onRate: (next: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      {RATING_SCALE.map((level) => {
        const on = value === level.value;
        return (
          <Pressable
            key={level.value}
            disabled={disabled}
            hitSlop={6}
            style={styles.face}
            onPress={() => onRate(on ? null : level.value)}
          >
            <Text style={[styles.emoji, on ? styles.emojiOn : styles.emojiOff]}>{level.emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 14, alignItems: "center" },
  face: { paddingVertical: 2 },
  emoji: { fontSize: 22 },
  emojiOn: { opacity: 1, transform: [{ scale: 1.15 }] },
  emojiOff: { opacity: 0.3 },
});
