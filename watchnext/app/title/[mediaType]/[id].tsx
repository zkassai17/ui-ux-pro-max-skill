import { useState, useEffect } from "react";
import { ScrollView, View, Text, TextInput, Image, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getWatchProviders } from "../../../src/services/catalog";
import { getTitleDetailsCached } from "../../../src/services/catalog";
import { addToLibrary, getLibraryEntry, updateStatus, rateTitle, removeFromLibrary, setNote, setFavorite } from "../../../src/services/watchlist";
import { PosterImage } from "../../../src/components/PosterImage";
import { EmojiRating } from "../../../src/components/EmojiRating";
import { posterUrl } from "../../../src/lib/tmdbNormalize";
import { containsProfanity } from "../../../src/lib/profanity";
import { useI18n } from "../../../src/i18n/I18nProvider";
import type { MediaType, TitleDetail, WatchProvider } from "../../../src/types/tmdb";
import type { WatchStatus } from "../../../src/types/db";

import { HEADING } from "../../../src/theme";
const STATUS_KEYS: WatchStatus[] = ["want", "watching", "watched"];

export default function TitleDetailScreen() {
  const { t } = useI18n();
  const { mediaType, id } = useLocalSearchParams<{ mediaType: MediaType; id: string }>();
  const tmdbId = Number(id);
  const qc = useQueryClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [favSaving, setFavSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const detail = useQuery({
    queryKey: ["tmdb-detail", mediaType, tmdbId],
    queryFn: () => getTitleDetailsCached(mediaType as MediaType, tmdbId),
  });
  const entry = useQuery({
    queryKey: ["library-entry", mediaType, tmdbId],
    queryFn: () => getLibraryEntry(tmdbId, mediaType as MediaType),
  });
  const providers = useQuery({
    queryKey: ["watch-providers", mediaType, tmdbId],
    queryFn: () => getWatchProviders(mediaType as MediaType, tmdbId),
  });

  // Keep the review box in sync with the saved note once the entry loads.
  useEffect(() => {
    setNoteText(entry.data?.note ?? "");
  }, [entry.data?.note]);

  async function saveNote() {
    if (!entry.data) return;
    if (containsProfanity(noteText)) {
      Alert.alert(t("review.blockedTitle"), t("review.blockedBody"));
      return;
    }
    try {
      setSavingNote(true);
      await setNote(entry.data.id, noteText);
      await qc.invalidateQueries({ queryKey: ["library-entry", mediaType, tmdbId] });
      await qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    } catch (e) {
      Alert.alert(t("alert.cantSave"), (e as Error).message);
    } finally {
      setSavingNote(false);
    }
  }

  async function setStatus(status: WatchStatus, d: TitleDetail) {
    try {
      setSaving(true);
      if (entry.data) await updateStatus(entry.data.id, status);
      else await addToLibrary(d, status);
      await qc.invalidateQueries({ queryKey: ["library-entry", mediaType, tmdbId] });
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      Alert.alert(t("alert.cantSave"), (e as Error).message);
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
      Alert.alert(t("alert.cantSave"), (e as Error).message);
    } finally {
      setRating(false);
    }
  }

  async function toggleFavorite(d: TitleDetail) {
    const next = !(entry.data?.is_favorite ?? false);
    try {
      setFavSaving(true);
      await setFavorite(d, next);
      await qc.invalidateQueries({ queryKey: ["library-entry", mediaType, tmdbId] });
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      Alert.alert(t("alert.cantSave"), (e as Error).message);
    } finally {
      setFavSaving(false);
    }
  }

  async function doRemove(entryId: string) {
    try {
      setRemoving(true);
      await removeFromLibrary(entryId);
      await qc.invalidateQueries({ queryKey: ["library-entry", mediaType, tmdbId] });
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      Alert.alert(t("alert.cantRemove"), (e as Error).message);
    } finally {
      setRemoving(false);
    }
  }

  function confirmRemove(entryId: string) {
    Alert.alert(t("title.removeConfirmTitle"), t("title.removeConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.remove"), style: "destructive", onPress: () => doRemove(entryId) },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: detail.data?.title ?? t("title.screenTitle") }} />
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
                  <Text style={styles.statusHeading}>{current ? t("title.inLibrary") : t("title.addToLibrary")}</Text>
                  {STATUS_KEYS.map((key) => (
                    <Pressable
                      key={key}
                      disabled={saving || removing}
                      style={[styles.statusBtn, current === key && styles.statusBtnOn]}
                      onPress={() => setStatus(key, d)}
                    >
                      <Text style={[styles.statusBtnText, current === key && styles.statusBtnTextOn]}>
                        {t(`status.${key}`)}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    disabled={favSaving}
                    style={[styles.favBtn, entry.data?.is_favorite && styles.favBtnOn]}
                    onPress={() => toggleFavorite(d)}
                  >
                    <Text style={[styles.favBtnText, entry.data?.is_favorite && styles.favBtnTextOn]}>
                      {entry.data?.is_favorite ? "♥  " : "♡  "}
                      {t(entry.data?.is_favorite ? "title.favorited" : "title.favorite")}
                    </Text>
                  </Pressable>
                  {entry.data ? (
                    <Pressable
                      disabled={saving || removing}
                      style={styles.removeBtn}
                      onPress={() => confirmRemove(entry.data!.id)}
                    >
                      <Text style={styles.removeBtnText}>{removing ? t("title.removing") : t("title.remove")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Text style={styles.title}>{d.title}</Text>
              <Text style={styles.sub}>
                {[d.year, d.mediaType === "movie" ? t("media.movie") : t("media.tv"), d.rating ? `⭐ ${d.rating} ${t("title.community")}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {d.genres.length > 0 ? <Text style={styles.genres}>{d.genres.join(" · ")}</Text> : null}
              {d.overview ? <Text style={styles.overview}>{d.overview}</Text> : null}

              <View style={styles.ratingBox}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.section}>{t("title.yourRating")}</Text>
                  {rating ? <ActivityIndicator size="small" style={{ marginLeft: 10 }} /> : null}
                </View>
                <EmojiRating
                  value={entry.data?.rating ?? null}
                  disabled={rating}
                  onRate={(next) => setRating_(next, d)}
                  emptyLabel={t("title.tapToRate")}
                />
              </View>

              {/* Public review — visible to friends in the activity feed. Only for
                  titles already in your library. */}
              {entry.data ? (
                <View style={styles.reviewBox}>
                  <Text style={styles.section}>{t("title.yourReview")}</Text>
                  <TextInput
                    style={styles.reviewInput}
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder={t("title.reviewPlaceholder")}
                    placeholderTextColor="#aaa"
                    multiline
                    maxLength={500}
                  />
                  {noteText.trim() !== (entry.data.note ?? "").trim() ? (
                    <Pressable style={styles.reviewSave} onPress={saveNote} disabled={savingNote}>
                      {savingNote ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.reviewSaveText}>{t("common.save")}</Text>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <Text style={styles.section}>{t("title.whereToWatch")}</Text>
              {providers.isLoading ? (
                <ActivityIndicator />
              ) : (
                (() => {
                  const p = providers.data;
                  const groups: { key: string; label: string; list: WatchProvider[] }[] = [
                    { key: "stream", label: t("watch.stream"), list: p?.flatrate ?? [] },
                    { key: "rent", label: t("watch.rent"), list: p?.rent ?? [] },
                    { key: "buy", label: t("watch.buy"), list: p?.buy ?? [] },
                  ].filter((g) => g.list.length > 0);
                  if (groups.length === 0) {
                    return <Text style={styles.notAvailable}>{t("title.notAvailable")}</Text>;
                  }
                  return groups.map((g) => (
                    <View key={g.key} style={styles.providerGroup}>
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
                <Text style={styles.btnText}>{t("title.recommend")}</Text>
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
  title: { fontFamily: HEADING, fontSize: 22, fontWeight: "700", marginTop: 14 },
  sub: { fontSize: 13, color: "#888", marginTop: 4 },
  genres: { fontSize: 12, color: "#5b6cff", marginTop: 8 },
  overview: { fontSize: 14, color: "#444", lineHeight: 21, marginTop: 12 },
  section: { fontSize: 13, fontWeight: "700", marginTop: 22, marginBottom: 8 },
  ratingBox: { alignSelf: "stretch" },
  reviewBox: { alignSelf: "stretch" },
  reviewInput: { backgroundColor: "#f4f4f7", borderRadius: 12, padding: 12, fontSize: 14, color: "#111", minHeight: 64, textAlignVertical: "top" },
  reviewSave: { alignSelf: "flex-start", backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20, marginTop: 8 },
  reviewSaveText: { color: "#fff", fontWeight: "800", fontSize: 13 },
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
  favBtn: { borderWidth: 1.5, borderColor: "#ff5470", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 2 },
  favBtnOn: { backgroundColor: "#ff5470", borderColor: "#ff5470" },
  favBtnText: { fontSize: 14, color: "#ff5470", fontWeight: "700" },
  favBtnTextOn: { color: "#fff" },
  removeBtn: { paddingVertical: 8, alignItems: "center", marginTop: 2 },
  removeBtnText: { fontSize: 13, color: "#d23", fontWeight: "600" },
  btn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginTop: 24, alignSelf: "stretch", alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  msg: { color: "#888", fontSize: 13, margin: 24, textAlign: "center" },
});
