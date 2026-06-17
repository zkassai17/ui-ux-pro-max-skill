import { Pressable, Text, View, StyleSheet, ActivityIndicator, Alert } from "react-native";
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

  return (
    <View style={styles.row}>
      {OPTIONS.map((o) => {
        const active = current === o.key;
        return (
          <Pressable
            key={o.key}
            style={[styles.btn, active && styles.btnActive]}
            onPress={() => choose.mutate(o.key)}
            disabled={busy}
            hitSlop={4}
          >
            {busy && active ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {active ? `✓ ${o.label}` : o.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#eef0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: { backgroundColor: "#5b6cff" },
  label: { fontSize: 12, fontWeight: "700", color: "#5b6cff" },
  labelActive: { color: "#fff" },
});
