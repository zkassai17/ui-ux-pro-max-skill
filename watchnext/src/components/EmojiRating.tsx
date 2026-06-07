import { View, Text, Pressable, StyleSheet } from "react-native";
import { RATING_SCALE, ratingLevel } from "../lib/ratingScale";

// 1–5 emoji rating picker. Faces sit in a row (worst → best); the selected one
// colors in and scales up, and its single word shows below. Tapping the current
// rating again clears it (null).
export function EmojiRating({
  value,
  onRate,
  disabled,
  emptyLabel = "Tap to rate",
}: {
  value: number | null;
  onRate: (next: number | null) => void;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const selected = ratingLevel(value);
  return (
    <View>
      <View style={styles.row}>
        {RATING_SCALE.map((level) => {
          const on = value === level.value;
          return (
            <Pressable
              key={level.value}
              disabled={disabled}
              hitSlop={4}
              style={styles.face}
              onPress={() => onRate(on ? null : level.value)}
            >
              <Text style={[styles.emoji, on ? styles.emojiOn : styles.emojiOff]}>
                {level.emoji}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.label, selected ? { color: selected.color } : styles.labelEmpty]}>
        {selected ? selected.label : emptyLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", maxWidth: 280 },
  face: { paddingHorizontal: 2 },
  emoji: { fontSize: 34 },
  emojiOn: { opacity: 1, transform: [{ scale: 1.18 }] },
  emojiOff: { opacity: 0.35 },
  label: { fontSize: 14, fontWeight: "700", marginTop: 10 },
  labelEmpty: { color: "#999", fontWeight: "600" },
});
