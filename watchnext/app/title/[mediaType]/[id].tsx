import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTitleDetails } from "../../../src/services/tmdb";
import { addToLibrary, getLibraryEntry, updateStatus } from "../../../src/services/watchlist";
import { PosterImage } from "../../../src/components/PosterImage";
import type { MediaType, TitleDetail } from "../../../src/types/tmdb";
import type { WatchStatus } from "../../../src/types/db";

const STATUSES: { key: WatchStatus; label: string }[] = [
  { key: "want", label: "Want" },
  { key: "watching", label: "Watching" },
  { key: "watched", label: "Watched" },
];

export default function TitleDetailScreen() {
  const { mediaType, id } = useLocalSearchParams<{ mediaType: MediaType; id: string }>();
  const tmdbId = Number(id);
  const qc = useQueryClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const detail = useQuery({
    queryKey: ["tmdb-detail", mediaType, tmdbId],
    queryFn: () => getTitleDetails(mediaType as MediaType, tmdbId),
  });
  const entry = useQuery({
    queryKey: ["library-entry", mediaType, tmdbId],
    queryFn: () => getLibraryEntry(tmdbId, mediaType as MediaType),
  });

  async function setStatus(status: WatchStatus, d: TitleDetail) {
    try {
      setSaving(true);
      if (entry.data) await updateStatus(entry.data.id, status);
      else await addToLibrary(d, status);
      await qc.invalidateQueries({ queryKey: ["library-entry", mediaType, tmdbId] });
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      Alert.alert("Couldn't save", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: detail.data?.title ?? "Title" }} />
      {detail.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : detail.isError ? (
        <Text style={styles.msg}>{(detail.error as Error).message}</Text>
      ) : (
        (() => {
          const d = detail.data!;
          const current = entry.data?.status ?? null;
          return (
            <>
              <PosterImage path={d.posterPath} width={140} height={210} radius={12} />
              <Text style={styles.title}>{d.title}</Text>
              <Text style={styles.sub}>
                {[d.year, d.mediaType === "movie" ? "Movie" : "TV", d.rating ? `⭐ ${d.rating}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {d.genres.length > 0 ? <Text style={styles.genres}>{d.genres.join(" · ")}</Text> : null}
              {d.overview ? <Text style={styles.overview}>{d.overview}</Text> : null}

              <Text style={styles.section}>Add to library</Text>
              <View style={styles.segRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s.key}
                    disabled={saving}
                    style={[styles.chip, current === s.key && styles.chipOn]}
                    onPress={() => setStatus(s.key, d)}
                  >
                    <Text style={[styles.chipText, current === s.key && styles.chipTextOn]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.btn} onPress={() => router.push(`/recommend/${d.mediaType}/${d.tmdbId}`)}>
                <Text style={styles.btnText}>Recommend to a friend</Text>
              </Pressable>
            </>
          );
        })()
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: "flex-start" },
  title: { fontSize: 22, fontWeight: "700", marginTop: 14 },
  sub: { fontSize: 13, color: "#888", marginTop: 4 },
  genres: { fontSize: 12, color: "#5b6cff", marginTop: 8 },
  overview: { fontSize: 14, color: "#444", lineHeight: 21, marginTop: 12 },
  section: { fontSize: 13, fontWeight: "700", marginTop: 22, marginBottom: 8 },
  segRow: { flexDirection: "row", gap: 8 },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 13, color: "#666", fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  btn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginTop: 24, alignSelf: "stretch", alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  msg: { color: "#888", fontSize: 13, margin: 24, textAlign: "center" },
});
