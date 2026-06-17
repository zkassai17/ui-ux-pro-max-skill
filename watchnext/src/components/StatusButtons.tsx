import { Pressable, Text, View, StyleSheet, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLibraryEntry, addToLibrary, updateStatus, removeFromLibrary } from "../services/watchlist";
import type { Title } from "../types/tmdb";
import type { WatchStatus } from "../types/db";

const OPTIONS: { key: WatchStatus; label: string }[] = [
  { key: "want", label: "Want" },
  { key: "watching", label: "Watching" },
  { key: "watched", label: "Watched" },
];

// Three always-visible status buttons. Tap one to set that status; tap the
// active one to remove it. No hidden long-press — every choice is on screen.
export function StatusButtons({
  title,
  onAdded,
  onRemoved,
}: {
  title: Title;
  onAdded?: () => void;
  onRemoved?: () => void;
}) {
  const qc = useQueryClient();
  const entryKey = ["library-entry", title.mediaType, title.tmdbId];
  const entry = useQuery({
    queryKey: entryKey,
    queryFn: () => getLibraryEntry(title.tmdbId, title.mediaType),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: entryKey });
    qc.invalidateQueries({ queryKey: ["library"] });
  }

  const choose = useMutation({
    mutationFn: async (status: WatchStatus): Promise<"set" | "removed"> => {
      const existing = entry.data;
      if (existing && existing.status === status) {
        await removeFromLibrary(existing.id); // tapping the active status clears it
        return "removed";
      }
      if (existing) await updateStatus(existing.id, status);
      else await addToLibrary(title, status);
      return "set";
    },
    onSuccess: (result) => {
      refresh();
      if (result === "removed") onRemoved?.();
      else onAdded?.();
    },
    onError: (e) => Alert.alert("Couldn't update", (e as Error).message),
  });

  const current = entry.data?.status ?? null;
  const busy = entry.isLoading || choose.isPending;

  // One compact segmented control instead of three big pills — the active
  // segment fills in, the rest stay quiet, so the row reads cleanly.
  return (
    <View style={[styles.group, busy && styles.groupBusy]}>
      {OPTIONS.map((o) => {
        const active = current === o.key;
        return (
          <Pressable
            key={o.key}
            style={[styles.seg, active && styles.segActive]}
            onPress={() => choose.mutate(o.key)}
            disabled={busy}
            hitSlop={4}
          >
            <Text style={[styles.segText, active && styles.segTextActive]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f3",
    borderRadius: 999,
    padding: 3,
  },
  groupBusy: { opacity: 0.5 },
  seg: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  segActive: { backgroundColor: "#5b6cff" },
  segText: { fontSize: 12, fontWeight: "700", color: "#777" },
  segTextActive: { color: "#fff" },
});
