import { useState } from "react";
import { ScrollView, View, Text, Image, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTitleDetails, getWatchProviders } from "../../../src/services/tmdb";
import { addToLibrary, getLibraryEntry, updateStatus, rateTitle, removeFromLibrary } from "../../../src/services/watchlist";
import { PosterImage } from "../../../src/components/PosterImage";
import { EmojiRating } from "../../../src/components/EmojiRating";
import { posterUrl } from "../../../src/lib/tmdbNormalize";
import type { MediaType, TitleDetail, WatchProvider } from "../../../src/types/tmdb";
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
  const [rating, setRating] = useState(false);
  const [removing, setRemoving] = useState(false);

  const detail = useQuery({
    queryKey: ["tmdb-detail", mediaType, tmdbId],
    queryFn: () => getTitleDetails(mediaType as MediaType, tmdbId),
  });
  const entry = useQuery({
    queryKey: ["library-entry", mediaType, tmdbId],
    queryFn: () => getLibraryEntry(tmdbId, mediaType as MediaType),
  });
  const providers = useQuery({
    queryKey: ["watch-providers", mediaType, tmdbId],
    queryFn: () => getWatchProviders(mediaType as MediaType, tmdbId),
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

  async function setRating_(next: number | null, d: TitleDetail) {
    try {
      setRating(true);
      await rateTitle(d, next);
      await qc.invalidateQueries({ queryKey: ["library-entry", mediaType, tmdbId] });
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      Alert.alert("Couldn't save rating", (e as Error).message);
    } finally {
      setRating(false);
    }
  }

  async function doRemove(entryId: string) {
    try {
      setRemoving(true);
      await removeFromLibrary(entryId);
      await qc.invalidateQueries({ queryKey: ["library-entry", mediaType, tmdbId] });
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      Alert.alert("Couldn't remove", (e as Error).message);
    } finally {
      setRemoving(false);
    }
  }

  function confirmRemove(entryId: string, title: string) {
    Alert.alert("Remove from library?", `“${title}” will be removed from your library.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => doRemove(entryId) },
    ]);
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
              <View style={styles.headerRow}>
                <PosterImage path={d.posterPath} width={130} height={195} radius={12} />
                <View style={styles.statusCol}>
                  <Text style={styles.statusHeading}>{current ? "In your library" : "Add to library"}</Text>
                  {STATUSES.map((s) => (
                    <Pressable
                      key={s.key}
                      disabled={saving || removing}
                      style={[styles.statusBtn, current === s.key && styles.statusBtnOn]}
                      onPress={() => setStatus(s.key, d)}
                    >
                      <Text style={[styles.statusBtnText, current === s.key && styles.statusBtnTextOn]}>
                        {s.label}
                      </Text>
                    </Pressable>
                  ))}
                  {entry.data ? (
                    <Pressable
                      disabled={saving || removing}
                      style={styles.removeBtn}
                      onPress={() => confirmRemove(entry.data!.id, d.title)}
                    >
                      <Text style={styles.removeBtnText}>{removing ? "Removing…" : "Remove from library"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Text style={styles.title}>{d.title}</Text>
              <Text style={styles.sub}>
                {[d.year, d.mediaType === "movie" ? "Movie" : "TV", d.rating ? `⭐ ${d.rating} community` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {d.genres.length > 0 ? <Text style={styles.genres}>{d.genres.join(" · ")}</Text> : null}
              {d.overview ? <Text style={styles.overview}>{d.overview}</Text> : null}

              <View style={styles.ratingBox}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.section}>Your rating</Text>
                  {rating ? <ActivityIndicator size="small" style={{ marginLeft: 10 }} /> : null}
                </View>
                <EmojiRating
                  value={entry.data?.rating ?? null}
                  disabled={rating}
                  onRate={(next) => setRating_(next, d)}
                  emptyLabel="Tap to rate — adds it to Watched"
                />
              </View>

              <Text style={styles.section}>Where to watch</Text>
              {providers.isLoading ? (
                <ActivityIndicator />
              ) : (
                (() => {
                  const p = providers.data;
                  const groups: { label: string; list: WatchProvider[] }[] = [
                    { label: "Stream", list: p?.flatrate ?? [] },
                    { label: "Rent", list: p?.rent ?? [] },
                    { label: "Buy", list: p?.buy ?? [] },
                  ].filter((g) => g.list.length > 0);
                  if (groups.length === 0) {
                    return <Text style={styles.notAvailable}>Not available on US streaming right now.</Text>;
                  }
                  return groups.map((g) => (
                    <View key={g.label} style={styles.providerGroup}>
                      <Text style={styles.providerLabel}>{g.label}</Text>
                      <View style={styles.providerRow}>
                        {g.list.map((prov) => {
                          const logo = posterUrl(prov.logoPath, "w92");
                          return logo ? (
                            <Image key={prov.providerId} source={{ uri: logo }} style={styles.providerLogo} />
                          ) : (
                            <Text key={prov.providerId} style={styles.providerName}>
                              {prov.name}
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  ));
                })()
              )}

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
  ratingBox: { alignSelf: "stretch" },
  ratingHeader: { flexDirection: "row", alignItems: "center" },
  notAvailable: { fontSize: 13, color: "#888" },
  providerGroup: { marginBottom: 10 },
  providerLabel: { fontSize: 11, color: "#888", fontWeight: "700", marginBottom: 6 },
  providerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  providerLogo: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#f0f0f3" },
  providerName: { fontSize: 12, color: "#444", backgroundColor: "#f0f0f3", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  headerRow: { flexDirection: "row", gap: 14, alignSelf: "stretch" },
  statusCol: { flex: 1, gap: 8 },
  statusHeading: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  statusBtn: { borderWidth: 1.5, borderColor: "#5b6cff", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  statusBtnOn: { backgroundColor: "#5b6cff" },
  statusBtnText: { fontSize: 14, color: "#5b6cff", fontWeight: "600" },
  statusBtnTextOn: { color: "#fff" },
  removeBtn: { paddingVertical: 8, alignItems: "center", marginTop: 2 },
  removeBtnText: { fontSize: 13, color: "#d23", fontWeight: "600" },
  btn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginTop: 24, alignSelf: "stretch", alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  msg: { color: "#888", fontSize: 13, margin: 24, textAlign: "center" },
});
