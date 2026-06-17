import { View, Text, Pressable, StyleSheet } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setReaction, removeReaction } from "../services/reactions";
import { nextReaction, type ReactionSummary } from "../lib/reactionsLogic";

const EMOJIS = ["👍", "❤️", "😂", "😮", "🔥"];

// A compact reaction bar under a feed card. Tap an emoji to react; tap your own
// again to clear it. Counts show next to any emoji others have used.
export function FeedReactions({
  targetId,
  targetOwner,
  summary,
}: {
  targetId: string;
  targetOwner: string;
  summary?: ReactionSummary;
}) {
  const qc = useQueryClient();
  const mine = summary?.mine ?? null;
  const counts = summary?.counts ?? {};

  const react = useMutation({
    mutationFn: async (emoji: string) => {
      const { action } = nextReaction(mine, emoji);
      if (action === "remove") await removeReaction(targetId);
      else await setReaction(targetId, targetOwner, emoji);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reactions"] }),
  });

  return (
    <View style={styles.row}>
      {EMOJIS.map((e) => {
        const count = counts[e] ?? 0;
        const active = mine === e;
        return (
          <Pressable
            key={e}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => react.mutate(e)}
            disabled={react.isPending}
            hitSlop={4}
          >
            <Text style={styles.emoji}>{e}</Text>
            {count > 0 ? (
              <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginTop: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f4f4f6",
  },
  chipActive: { backgroundColor: "#e6e8ff", borderWidth: 1, borderColor: "#5b6cff" },
  emoji: { fontSize: 14 },
  count: { fontSize: 11, fontWeight: "700", color: "#888" },
  countActive: { color: "#5b6cff" },
});
