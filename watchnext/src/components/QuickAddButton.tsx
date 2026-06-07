import { Pressable, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLibraryEntry, addToLibrary, updateStatus } from "../services/watchlist";
import type { Title } from "../types/tmdb";
import type { WatchStatus } from "../types/db";

const STATUS_LABEL: Record<WatchStatus, string> = {
  want: "Want",
  watching: "Watching",
  watched: "Watched",
};

export function QuickAddButton({ title }: { title: Title }) {
  const qc = useQueryClient();
  const entryKey = ["library-entry", title.mediaType, title.tmdbId];

  const entry = useQuery({
    queryKey: entryKey,
    queryFn: () => getLibraryEntry(title.tmdbId, title.mediaType),
  });

  const set = useMutation({
    mutationFn: async (status: WatchStatus) => {
      const existing = entry.data;
      if (existing) await updateStatus(existing.id, status);
      else await addToLibrary(title, status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: entryKey });
      qc.invalidateQueries({ queryKey: ["library"] });
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

  const busy = entry.isLoading || set.isPending;
  const status = entry.data?.status ?? null;
  const added = status !== null;

  return (
    <Pressable
      style={[styles.btn, added && styles.btnAdded]}
      onPress={() => set.mutate("watched")}
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
});
