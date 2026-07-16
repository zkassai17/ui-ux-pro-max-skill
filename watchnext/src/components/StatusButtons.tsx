import { useEffect, useRef, type ComponentProps } from "react";
import { Pressable, Text, View, StyleSheet, Alert, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLibrary, addToLibrary, updateStatus, removeFromLibrary } from "../services/watchlist";
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

  // Derive membership from the shared ["library"] cache — one fetch for the whole
  // screen instead of a separate network query behind every row of buttons.
  const lib = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const entry =
    (lib.data ?? []).find((e) => e.tmdb_id === title.tmdbId && e.media_type === title.mediaType) ?? null;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["library"] });
    // Keep the (separately cached) title detail page in sync with this change.
    qc.invalidateQueries({ queryKey: ["library-entry"] });
  }

  const choose = useMutation({
    mutationFn: async (status: WatchStatus): Promise<"set" | "removed"> => {
      if (entry && entry.status === status) {
        await removeFromLibrary(entry.id);
        return "removed";
      }
      if (entry) await updateStatus(entry.id, status);
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

  const current = entry?.status ?? null;
  const busy = lib.isLoading || choose.isPending;

  return (
    <View style={[styles.row, busy && styles.busy]}>
      {OPTIONS.map((o) => (
        <StatusItem
          key={o.key}
          on={o.on}
          off={o.off}
          label={t(`status.${o.key}`)}
          active={current === o.key}
          disabled={busy}
          onPress={() => choose.mutate(o.key)}
        />
      ))}
    </View>
  );
}

// One status icon. Pops when it becomes active (satisfying confirmation) and
// scales down while pressed. Native-driven so it stays smooth.
function StatusItem({
  on,
  off,
  label,
  active,
  disabled,
  onPress,
}: {
  on: IconName;
  off: IconName;
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const press = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      pop.setValue(0.7);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 16 }).start();
    }
    wasActive.current = active;
  }, [active, pop]);

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      onPressIn={() => Animated.spring(press, { toValue: 0.9, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }).start()}
      disabled={disabled}
      hitSlop={6}
    >
      <Animated.View style={{ transform: [{ scale: press }, { scale: pop }] }}>
        <Ionicons name={active ? on : off} size={22} color={active ? ACTIVE : IDLE} />
      </Animated.View>
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  busy: { opacity: 0.5 },
  item: { alignItems: "center", width: 54 },
  label: { fontSize: 9, fontWeight: "600", color: "#b0b0b8", marginTop: 2 },
  labelActive: { color: ACTIVE },
});
