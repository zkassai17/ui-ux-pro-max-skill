import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { parseWatchHistory } from "../src/lib/importHistory";
import { searchTitles } from "../src/services/tmdb";
import { addToLibrary } from "../src/services/watchlist";
import { PosterImage } from "../src/components/PosterImage";
import type { Title } from "../src/types/tmdb";

type Matched = { query: string; match: Title | null };

async function matchTitles(titles: string[]): Promise<Matched[]> {
  const out: Matched[] = [];
  const CONCURRENCY = 5;
  for (let i = 0; i < titles.length; i += CONCURRENCY) {
    const batch = titles.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (q): Promise<Matched> => {
        try {
          const r = await searchTitles(q);
          return { query: q, match: r[0] ?? null };
        } catch {
          return { query: q, match: null };
        }
      })
    );
    out.push(...settled);
  }
  return out;
}

function keyOf(t: Title): string {
  return `${t.mediaType}:${t.tmdbId}`;
}

export default function ImportScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pasted, setPasted] = useState("");
  const [titles, setTitles] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addedCount, setAddedCount] = useState<number | null>(null);

  const match = useQuery({
    queryKey: ["import-match", titles],
    enabled: !!titles && titles.length > 0,
    queryFn: () => matchTitles(titles as string[]),
    retry: false,
    staleTime: Infinity,
  });

  // Default-select every confident match (deduped) when results arrive.
  useEffect(() => {
    if (!match.data) return;
    const seen = new Set<string>();
    for (const m of match.data) {
      if (m.match) seen.add(keyOf(m.match));
    }
    setSelected(seen);
  }, [match.data]);

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/comma-separated-values", "text/plain", "application/vnd.ms-excel", "*/*"],
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const text = await new File(res.assets[0].uri).text();
    setAddedCount(null);
    setTitles(parseWatchHistory(text));
  }

  function usePasted() {
    setAddedCount(null);
    setTitles(parseWatchHistory(pasted));
  }

  function reset() {
    setTitles(null);
    setSelected(new Set());
    setAddedCount(null);
    setPasted("");
  }

  // Deduped matched rows + the titles we couldn't find.
  const matchedRows: { key: string; title: Title; query: string }[] = [];
  const unmatched: string[] = [];
  if (match.data) {
    const seen = new Set<string>();
    for (const m of match.data) {
      if (!m.match) {
        unmatched.push(m.query);
        continue;
      }
      const k = keyOf(m.match);
      if (seen.has(k)) continue;
      seen.add(k);
      matchedRows.push({ key: k, title: m.match, query: m.query });
    }
  }

  const add = useMutation({
    mutationFn: async () => {
      const chosen = matchedRows.filter((r) => selected.has(r.key));
      for (const r of chosen) {
        await addToLibrary(r.title, "watched");
      }
      return chosen.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["library"] });
      setAddedCount(n);
    },
  });

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // --- Success state ---
  if (addedCount !== null) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Import" }} />
        <Text style={styles.bigCheck}>✓</Text>
        <Text style={styles.successText}>Added {addedCount} titles to Watched.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={reset}>
          <Text style={styles.linkText}>Import more</Text>
        </Pressable>
      </View>
    );
  }

  // --- Input state (no titles parsed yet) ---
  if (!titles) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Import" }} />
        <Text style={styles.intro}>
          Bring in what you've already watched. Netflix: netflix.com/viewingactivity → “Download all”,
          then upload the CSV. For Hulu/Max/Prime, copy titles from your watch history and paste below —
          one per line. Episodes and duplicates are cleaned automatically.
        </Text>

        <Pressable style={styles.primaryBtn} onPress={pickFile}>
          <Text style={styles.primaryBtnText}>Upload CSV file</Text>
        </Pressable>

        <Text style={styles.or}>or paste a list</Text>
        <TextInput
          style={styles.paste}
          placeholder={"Cobra Kai\nInterstellar\nThe Bear"}
          value={pasted}
          onChangeText={setPasted}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={[styles.primaryBtn, !pasted.trim() && styles.btnDisabled]}
          disabled={!pasted.trim()}
          onPress={usePasted}
        >
          <Text style={styles.primaryBtnText}>Match pasted titles</Text>
        </Pressable>
      </View>
    );
  }

  // --- Empty parse result ---
  if (titles.length === 0) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Import" }} />
        <Text style={styles.successText}>No titles found in that file or list.</Text>
        <Pressable style={styles.primaryBtn} onPress={reset}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  // --- Matching / review state ---
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Import" }} />
      {match.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.matchingText}>Matching {titles.length} titles…</Text>
        </View>
      ) : (
        <FlatList
          data={matchedRows}
          keyExtractor={(r) => r.key}
          ListHeaderComponent={
            <Text style={styles.reviewHead}>
              {selected.size} of {matchedRows.length} selected
            </Text>
          }
          renderItem={({ item }) => {
            const on = selected.has(item.key);
            return (
              <Pressable style={styles.row} onPress={() => toggle(item.key)}>
                <View style={[styles.check, on && styles.checkOn]}>
                  {on ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
                <PosterImage path={item.title.posterPath} width={40} height={60} />
                <View style={styles.meta}>
                  <Text style={styles.title} numberOfLines={1}>{item.title.title}</Text>
                  {item.title.title.toLowerCase() !== item.query.toLowerCase() ? (
                    <Text style={styles.fromText} numberOfLines={1}>from “{item.query}”</Text>
                  ) : null}
                  <Text style={styles.pill}>{item.title.mediaType === "movie" ? "MOVIE" : "TV"}</Text>
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <View>
              {unmatched.length > 0 ? (
                <View style={styles.unmatched}>
                  <Text style={styles.unmatchedHead}>Couldn’t match ({unmatched.length})</Text>
                  {unmatched.map((u) => (
                    <Text key={u} style={styles.unmatchedItem} numberOfLines={1}>{u}</Text>
                  ))}
                </View>
              ) : null}
              <Pressable style={styles.linkBtn} onPress={reset}>
                <Text style={styles.linkText}>Start over</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {!match.isLoading ? (
        <Pressable
          style={[styles.primaryBtn, (selected.size === 0 || add.isPending) && styles.btnDisabled]}
          disabled={selected.size === 0 || add.isPending}
          onPress={() => add.mutate()}
        >
          {add.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Add {selected.size} to Watched</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  intro: { fontSize: 13, color: "#555", lineHeight: 19, marginBottom: 18 },
  or: { textAlign: "center", color: "#aaa", fontSize: 12, marginVertical: 14 },
  paste: { backgroundColor: "#f0f0f3", borderRadius: 10, padding: 12, fontSize: 14, minHeight: 120, textAlignVertical: "top", marginBottom: 12 },
  primaryBtn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  linkBtn: { alignItems: "center", paddingVertical: 14 },
  linkText: { color: "#5b6cff", fontWeight: "600", fontSize: 13 },
  matchingText: { color: "#888", fontSize: 13, marginTop: 12 },
  reviewHead: { fontSize: 12, color: "#888", fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: "#5b6cff", borderColor: "#5b6cff" },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600" },
  fromText: { fontSize: 11, color: "#aaa", marginTop: 1 },
  pill: { alignSelf: "flex-start", marginTop: 4, fontSize: 9, color: "#5b6cff", backgroundColor: "#eef0ff", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: "hidden" },
  unmatched: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#eee" },
  unmatchedHead: { fontSize: 12, fontWeight: "700", color: "#ff3b5b", marginBottom: 6 },
  unmatchedItem: { fontSize: 12, color: "#999", marginBottom: 3 },
  bigCheck: { fontSize: 48, color: "#5b6cff" },
  successText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
});
