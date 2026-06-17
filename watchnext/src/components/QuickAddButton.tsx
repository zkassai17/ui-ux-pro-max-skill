import { Pressable, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLibraryEntry, addToLibrary, updateStatus, removeFromLibrary } from "../services/watchlist";
import type { Title } from "../types/tmdb";
import type { WatchStatus } from "../types/db";

const STATUS_LABEL: Record<WatchStatus, string> = {
  want: "Want",
  watching: "Watching",
  watched: "Watched",
};

export function QuickAddButton({
  title,
  onAdded,
  onRemoved,
  compact,
  addStatus = "watched",
}: {
  title: Title;
  onAdded?: () => void;
  onRemoved?: () => void;
  // compact = a labelled "Add" pill meant to sit on a poster
  compact?: boolean;
  // which status a plain tap sets (long-press always offers all three)
  addStatus?: WatchStatus;
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

  const set = useMutation({
    mutationFn: async (status: WatchStatus) => {
      const existing = entry.data;
      if (existing) await updateStatus(existing.id, status);
      else await addToLibrary(title, status);
    },
    onSuccess: () => {
      refresh();
      onAdded?.();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const existing = entry.data;
      if (existing) await removeFromLibrary(existing.id);
    },
    onSuccess: () => {
      refresh();
      onRemoved?.();
    },
  });

  function pickStatus() {
    Alert.alert(title.title, "Add to your library as…", [
      { text: STATUS_LABEL.want, onPress: () => set.mutate("want") },
      { text: STATUS_LABEL.watching, onPress: () => set.mutate("watching") },
      { text: STATUS_LABEL.watched, onPress: () => set.mutate("watched") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const busy = entry.isLoading || set.isPending || remove.isPending;
  const status = entry.data?.status ?? null;
  const added = status !== null;

  if (compact) {
    // Labelled "Add" pill designed to sit at the bottom of a poster. Tap to add
    // (as `addStatus`, or remove); long-press for the Want/Watching/Watched chooser.
    return (
      <Pressable
        style={[styles.addPill, added && styles.addPillAdded]}
        onPress={() => (added ? remove.mutate() : set.mutate(addStatus))}
        onLongPress={pickStatus}
        disabled={busy}
        hitSlop={6}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.addPillText}>{added ? `✓ ${STATUS_LABEL[status!]}` : "＋ Add"}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.btn, added && styles.btnAdded]}
      onPress={() => (added ? remove.mutate() : set.mutate("watched"))}
      onLongPress={pickStatus}
      disabled={busy}
      hitSlop={8}
    >
      {busy ? (
        <ActivityIndicator size="small" color={added ? "#fff" : "#5b6cff"} />
      ) : (
        <Text style={[styles.label, added && styles.labelAdded]}>
          {added ? `✓ ${STATUS_LABEL[status!]}` : "+ Add"}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#eef0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnAdded: { backgroundColor: "#5b6cff" },
  label: { fontSize: 12, fontWeight: "700", color: "#5b6cff" },
  labelAdded: { color: "#fff" },
  addPill: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(91,108,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },
  addPillAdded: { backgroundColor: "rgba(29,209,161,0.96)" },
  addPillText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
