import { useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { searchTitles, discoverTitles, getGenres } from "../../src/services/tmdb";
import { TitleRow } from "../../src/components/TitleRow";
import { TOP_PROVIDERS } from "../../src/lib/providers";
import type { MediaType, Title } from "../../src/types/tmdb";

export default function AddScreen() {
  const [q, setQ] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [genreId, setGenreId] = useState<number | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  const router = useRouter();
  const searching = q.trim().length > 0;

  const search = useQuery({
    queryKey: ["tmdb-search", q.trim()],
    queryFn: () => searchTitles(q),
    enabled: searching,
  });
  const genres = useQuery({
    queryKey: ["tmdb-genres", mediaType],
    queryFn: () => getGenres(mediaType),
  });
  const discover = useQuery({
    queryKey: ["tmdb-discover", mediaType, genreId, providerId],
    queryFn: () => discoverTitles({ mediaType, genreId, providerId }),
    enabled: !searching,
  });

  function switchMedia(next: MediaType) {
    if (next === mediaType) return;
    setMediaType(next);
    setGenreId(null); // genre IDs differ between movie and tv
  }

  const active = searching ? search : discover;
  const results: Title[] = active.data ?? [];

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search movies & shows…"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {!searching ? (
        <View style={styles.filters}>
          <View style={styles.toggleRow}>
            {(["movie", "tv"] as MediaType[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.toggle, mediaType === m && styles.toggleOn]}
                onPress={() => switchMedia(m)}
              >
                <Text style={[styles.toggleText, mediaType === m && styles.toggleTextOn]}>
                  {m === "movie" ? "Movies" : "TV"}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {(genres.data ?? []).map((g) => (
              <Pressable
                key={g.id}
                style={[styles.chip, genreId === g.id && styles.chipOn]}
                onPress={() => setGenreId(genreId === g.id ? null : g.id)}
              >
                <Text style={[styles.chipText, genreId === g.id && styles.chipTextOn]}>{g.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {TOP_PROVIDERS.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.chip, providerId === p.id && styles.chipOn]}
                onPress={() => setProviderId(providerId === p.id ? null : p.id)}
              >
                <Text style={[styles.chipText, providerId === p.id && styles.chipTextOn]}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {active.isError ? (
        <Text style={styles.msg}>{(active.error as Error).message}</Text>
      ) : active.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : results.length === 0 ? (
        <Text style={styles.msg}>{searching ? "No results." : "Nothing matches those filters."}</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => `${t.mediaType}:${t.tmdbId}`}
          renderItem={({ item }) => (
            <TitleRow
              title={item.title}
              subtitle={[item.year, item.rating ? `⭐ ${item.rating}` : null].filter(Boolean).join(" · ")}
              mediaType={item.mediaType}
              posterPath={item.posterPath}
              onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  filters: { marginBottom: 8 },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  toggle: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  toggleOn: { backgroundColor: "#111" },
  toggleText: { fontSize: 13, color: "#666", fontWeight: "600" },
  toggleTextOn: { color: "#fff" },
  chipRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 12, color: "#666", fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
