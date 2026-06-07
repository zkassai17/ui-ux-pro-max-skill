import { View, Text, Pressable, StyleSheet } from "react-native";

const STARS = [1, 2, 3, 4, 5];

// Interactive 1–5 star picker. Tapping a star sets that rating; tapping the
// current rating again clears it (passes null). Disabled while saving.
export function StarRating({
  value,
  onRate,
  disabled,
  size = 30,
}: {
  value: number | null;
  onRate: (next: number | null) => void;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <View style={styles.row}>
      {STARS.map((n) => {
        const filled = value !== null && n <= value;
        return (
          <Pressable
            key={n}
            disabled={disabled}
            hitSlop={4}
            onPress={() => onRate(value === n ? null : n)}
          >
            <Text style={[{ fontSize: size }, filled ? styles.on : styles.off]}>
              {filled ? "★" : "☆"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4 },
  on: { color: "#ffb400" },
  off: { color: "#d4d4dc" },
});
