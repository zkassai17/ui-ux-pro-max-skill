import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../src/auth/AuthProvider";
import { supabase } from "../src/services/supabase";
import { isValidUsername, normalizeUsername } from "../src/lib/username";
import {
  getDefaultLibraryTab,
  setDefaultLibraryTab,
  getRecWeights,
  setRecWeights,
} from "../src/services/prefs";
import { exportLibraryCsv } from "../src/services/exportData";
import {
  REC_PRESETS,
  REC_LEVELS,
  LEVEL_LABELS,
  DEFAULT_REC_WEIGHTS,
  levelIndex,
  matchPreset,
  type RecDimension,
  type RecWeights,
} from "../src/lib/recPrefs";
import type { WatchStatus } from "../src/types/db";

const REC_DIMS: { key: RecDimension; label: string; note?: string }[] = [
  { key: "content", label: "Your taste" },
  { key: "collaborative", label: "Friends", note: "better with more friends" },
  { key: "trending", label: "Trending" },
];

const TABS: { key: WatchStatus; label: string }[] = [
  { key: "want", label: "Want" },
  { key: "watching", label: "Watching" },
  { key: "watched", label: "Watched" },
];

export default function SettingsScreen() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(profile?.username ?? "");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!profile?.friend_code) return;
    await Clipboard.setStringAsync(profile.friend_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const [showCustom, setShowCustom] = useState(false);
  const defaultTab = useQuery({ queryKey: ["pref-default-tab"], queryFn: getDefaultLibraryTab });
  const recWeights = useQuery({ queryKey: ["rec-weights"], queryFn: getRecWeights });

  const saveWeights = useMutation({
    mutationFn: (next: RecWeights) => setRecWeights(next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rec-weights"] });
      qc.invalidateQueries({ queryKey: ["for-you"] });
    },
  });

  const saveUsername = useMutation({
    mutationFn: async () => {
      const username = normalizeUsername(value);
      if (!isValidUsername(username)) {
        throw new Error("3–20 chars, start with a letter, letters/numbers/underscore only.");
      }
      if (username === profile?.username) return; // no change
      const { error } = await supabase.from("profiles").update({ username }).eq("id", session!.user.id);
      if (error) throw new Error(error.code === "23505" ? "That username is taken." : error.message);
    },
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ["friends"] });
      setEditing(false);
    },
    onError: (e) => Alert.alert("Couldn't save username", (e as Error).message),
  });

  const setTab = useMutation({
    mutationFn: (tab: WatchStatus) => setDefaultLibraryTab(tab),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pref-default-tab"] }),
  });

  const exportCsv = useMutation({
    mutationFn: exportLibraryCsv,
    onError: (e) => Alert.alert("Couldn't export", (e as Error).message),
  });

  function confirmSignOut() {
    Alert.alert("Sign out?", "You'll need to sign back in to use watchnext.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  const version = Constants.expoConfig?.version ?? "1.0.0";
  const current = defaultTab.data ?? "want";
  const weights = recWeights.data ?? DEFAULT_REC_WEIGHTS;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ headerShown: true, title: "Settings" }} />

      {/* Account */}
      <Text style={styles.section}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        {editing ? (
          <View style={styles.editRow}>
            <Text style={styles.at}>@</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              maxLength={20}
            />
            <Pressable onPress={() => saveUsername.mutate()} disabled={saveUsername.isPending} hitSlop={6}>
              {saveUsername.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.save}>Save</Text>
              )}
            </Pressable>
            <Pressable onPress={() => { setValue(profile?.username ?? ""); setEditing(false); }} hitSlop={6}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.valueRow}>
            <Text style={styles.value}>@{profile?.username ?? "you"}</Text>
            <Pressable onPress={() => setEditing(true)} hitSlop={6}>
              <Text style={styles.edit}>Edit</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.divider} />
        <Text style={styles.label}>Email</Text>
        <Text style={styles.valueMuted}>{session?.user.email ?? "—"}</Text>

        <View style={styles.divider} />
        <Text style={styles.label}>Friend code</Text>
        <Pressable style={styles.codeRow} onPress={copyCode} hitSlop={6}>
          <Text style={styles.codeValue}>{profile?.friend_code ?? "—"}</Text>
          <Text style={styles.copyHint}>{copied ? "Copied!" : "Copy ⧉"}</Text>
        </Pressable>
        <Text style={styles.hint}>Share this so friends can add you.</Text>
      </View>

      {/* Data */}
      <Text style={styles.section}>Data</Text>
      <Pressable style={styles.rowBtn} onPress={() => router.push("/import")}>
        <Text style={styles.rowBtnText}>↓ Import watch history</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable
        style={[styles.rowBtn, { marginTop: 10 }]}
        onPress={() => exportCsv.mutate()}
        disabled={exportCsv.isPending}
      >
        <Text style={styles.rowBtnText}>↑ Export my data (CSV)</Text>
        {exportCsv.isPending ? <ActivityIndicator size="small" /> : <Text style={styles.chevron}>›</Text>}
      </Pressable>

      {/* Preferences */}
      <Text style={styles.section}>Preferences</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Library opens on</Text>
        <View style={styles.segment}>
          {TABS.map((t) => {
            const on = current === t.key;
            return (
              <Pressable
                key={t.key}
                style={[styles.seg, on && styles.segOn]}
                onPress={() => setTab.mutate(t.key)}
              >
                <Text style={[styles.segText, on && styles.segTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Recommendations */}
      <Text style={styles.section}>Recommendations</Text>
      <View style={styles.card}>
        <Text style={styles.label}>How "for you" is picked</Text>
        <View style={styles.presetWrap}>
          {REC_PRESETS.map((p) => {
            const on = matchPreset(weights) === p.key;
            return (
              <Pressable
                key={p.key}
                style={[styles.preset, on && styles.presetOn]}
                onPress={() => saveWeights.mutate(p.weights)}
              >
                <Text style={[styles.presetText, on && styles.presetTextOn]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.customToggle} onPress={() => setShowCustom((s) => !s)} hitSlop={6}>
          <Text style={styles.customToggleText}>
            {showCustom ? "Hide fine-tuning ▴" : "Customize ▾"}
            {matchPreset(weights) === null ? "  · Custom" : ""}
          </Text>
        </Pressable>

        {showCustom ? (
          <View style={styles.customWrap}>
            {REC_DIMS.map((dim) => {
              const idx = levelIndex(dim.key, weights[dim.key]);
              return (
                <View key={dim.key} style={styles.dimRow}>
                  <View style={styles.dimLabelWrap}>
                    <Text style={styles.dimLabel}>{dim.label}</Text>
                    {dim.note ? <Text style={styles.dimNote}>{dim.note}</Text> : null}
                  </View>
                  <View style={styles.levelSeg}>
                    {LEVEL_LABELS.map((lab, i) => {
                      const on = idx === i;
                      return (
                        <Pressable
                          key={lab}
                          style={[styles.level, on && styles.levelOn]}
                          onPress={() =>
                            saveWeights.mutate({ ...weights, [dim.key]: REC_LEVELS[dim.key][i] })
                          }
                        >
                          <Text style={[styles.levelText, on && styles.levelTextOn]}>{lab}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* About */}
      <Text style={styles.section}>About</Text>
      <View style={styles.card}>
        <View style={styles.valueRow}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.valueMuted}>{version}</Text>
        </View>
      </View>

      <Pressable style={styles.signOut} onPress={confirmSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  section: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 22, marginBottom: 8 },
  card: { backgroundColor: "#f6f6f8", borderRadius: 14, padding: 16 },
  label: { fontSize: 12, color: "#888", fontWeight: "600" },
  valueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  value: { fontSize: 16, fontWeight: "700" },
  valueMuted: { fontSize: 15, color: "#444", marginTop: 4 },
  edit: { color: "#5b6cff", fontWeight: "700", fontSize: 14 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  at: { fontSize: 16, color: "#aaa", fontWeight: "700" },
  input: { flex: 1, fontSize: 16, fontWeight: "600", borderBottomWidth: 1.5, borderColor: "#5b6cff", paddingVertical: 2, color: "#111" },
  save: { color: "#5b6cff", fontWeight: "800", fontSize: 14 },
  cancel: { color: "#999", fontWeight: "600", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#e8e8ee", marginVertical: 14 },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  codeValue: { fontSize: 16, fontWeight: "700", letterSpacing: 1 },
  copyHint: { fontSize: 13, color: "#5b6cff", fontWeight: "700" },
  hint: { fontSize: 11, color: "#aaa", marginTop: 6 },
  rowBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f6f6f8", borderRadius: 14, padding: 16 },
  rowBtnText: { fontSize: 15, fontWeight: "600", color: "#5b6cff" },
  chevron: { fontSize: 20, color: "#bbb" },
  segment: { flexDirection: "row", backgroundColor: "#e9e9ef", borderRadius: 999, padding: 3, marginTop: 8 },
  seg: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: "center" },
  segOn: { backgroundColor: "#5b6cff" },
  segText: { fontSize: 13, fontWeight: "700", color: "#666" },
  segTextOn: { color: "#fff" },

  presetWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  preset: { backgroundColor: "#e9e9ef", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  presetOn: { backgroundColor: "#5b6cff" },
  presetText: { fontSize: 13, fontWeight: "700", color: "#555" },
  presetTextOn: { color: "#fff" },
  customToggle: { marginTop: 14 },
  customToggleText: { fontSize: 13, fontWeight: "700", color: "#5b6cff" },
  customWrap: { marginTop: 12, gap: 14 },
  dimRow: { gap: 6 },
  dimLabelWrap: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  dimLabel: { fontSize: 13, fontWeight: "700", color: "#333" },
  dimNote: { fontSize: 10, color: "#aaa" },
  levelSeg: { flexDirection: "row", backgroundColor: "#e9e9ef", borderRadius: 999, padding: 3 },
  level: { flex: 1, paddingVertical: 6, borderRadius: 999, alignItems: "center" },
  levelOn: { backgroundColor: "#5b6cff" },
  levelText: { fontSize: 12, fontWeight: "700", color: "#777" },
  levelTextOn: { color: "#fff" },

  signOut: { marginTop: 28, alignItems: "center", paddingVertical: 12 },
  signOutText: { color: "#ff3b5b", fontWeight: "700", fontSize: 15 },
});
