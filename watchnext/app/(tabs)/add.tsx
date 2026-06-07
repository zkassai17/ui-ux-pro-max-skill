import { useState } from "react";
import { View, TextInput, FlatList, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { searchTitles } from "../../src/services/tmdb";
import { TitleRow } from "../../src/components/TitleRow";

export default function AddScreen() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const enabled = q.trim().length > 0;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tmdb-search", q.trim()],
    queryFn: () => searchTitles(q),
    enabled,
  });

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
      {isError ? (
        <Text style={styles.msg}>{(error as Error).message}</Text>
      ) : isLoading && enabled ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : !enabled ? (
        <Text style={styles.msg}>Search for something to add to your library.</Text>
      ) : (data ?? []).length === 0 ? (
        <Text style={styles.msg}>No results.</Text>
      ) : (
        <FlatList
          data={data}
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
  search: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
