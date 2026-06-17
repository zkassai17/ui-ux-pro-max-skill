import type { ComponentProps } from "react";
import { Pressable, Text, View, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLibraryEntry, addToLibrary, updateStatus, removeFromLibrary } from "../services/watchlist";
import { useI18n } from "../i18n/I18nProvider";
import type { Title } from "../types/tmdb";
import type { WatchStatus } from "../types/db";

type IconName = ComponentProps<typeof Ionicons>["name"];

const OPTIONS: { key: WatchStatus; on: IconName; off: IconName }[] = [
  { key: "want", on: "bookmark", off: "bookmark-outline" },
  { key: "watching", on: "eye", off: "eye-outline" },
  { key: "watched", on: "checkmark-circle", off: "checkmark-circle-outline" },
];

const ACTIVE = "#5b6cff";
const IDLE = "#c4c4cc";

// Three small icon buttons. Tap one to set that status; tap the active one to
// clear it. Compact enough to sit on the right of a result row.
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
  const { t } = useI18n();
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
        await removeFromLibrary(existing.id);
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
    <View style={[styles.row, busy && styles.busy]}>
      {OPTIONS.map((o) => {
        const active = current === o.key;
        return (
          <Pressable
            key={o.key}
            style={styles.item}
            onPress={() => choose.mutate(o.key)}
            disabled={busy}
            hitSlop={6}
          >
            <Ionicons name={active ? o.on : o.off} size={22} color={active ? ACTIVE : IDLE} />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {t(`status.${o.key}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  busy: { opacity: 0.5 },
  item: { alignItems: "center", width: 42 },
  label: { fontSize: 9, fontWeight: "600", color: "#b0b0b8", marginTop: 2 },
  labelActive: { color: ACTIVE },
});
