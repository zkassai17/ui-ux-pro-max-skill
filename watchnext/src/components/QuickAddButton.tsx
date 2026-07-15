import { useEffect, useRef } from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, Alert, Animated } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLibraryEntry, addToLibrary, updateStatus, removeFromLibrary } from "../services/watchlist";
import { useI18n } from "../i18n/I18nProvider";
import type { Title } from "../types/tmdb";
import type { WatchStatus } from "../types/db";

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
    Alert.alert(title.title, undefined, [
      { text: t("status.want"), onPress: () => set.mutate("want") },
      { text: t("status.watching"), onPress: () => set.mutate("watching") },
      { text: t("status.watched"), onPress: () => set.mutate("watched") },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  const busy = entry.isLoading || set.isPending || remove.isPending;
  const status = entry.data?.status ?? null;
  const added = status !== null;

  // Press feedback (scales down while held) + a satisfying "pop" the moment a
  // title becomes added. Both are native-driven so they never drop frames.
  const press = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const wasAdded = useRef(added);
  useEffect(() => {
    if (added && !wasAdded.current) {
      pop.setValue(0.8);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }).start();
    }
    wasAdded.current = added;
  }, [added, pop]);
  const pressIn = () => Animated.spring(press, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const animStyle = { transform: [{ scale: press }, { scale: pop }] };

  if (compact) {
    // Labelled "Add" pill designed to sit at the bottom of a poster. Tap to add
    // (as `addStatus`, or remove); long-press for the Want/Watching/Watched chooser.
    return (
      <Pressable
        onPress={() => (added ? remove.mutate() : set.mutate(addStatus))}
        onLongPress={pickStatus}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={busy}
        hitSlop={6}
      >
        <Animated.View style={[styles.addPill, added && styles.addPillAdded, animStyle]}>
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addPillText}>{added ? `✓ ${t(`status.${status!}`)}` : `＋ ${t("common.add")}`}</Text>
          )}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => (added ? remove.mutate() : set.mutate("watched"))}
      onLongPress={pickStatus}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={busy}
      hitSlop={8}
    >
      <Animated.View style={[styles.btn, added && styles.btnAdded, animStyle]}>
        {busy ? (
          <ActivityIndicator size="small" color={added ? "#fff" : "#5b6cff"} />
        ) : (
          <Text style={[styles.label, added && styles.labelAdded]}>
            {added ? `✓ ${t(`status.${status!}`)}` : `+ ${t("common.add")}`}
          </Text>
        )}
      </Animated.View>
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
