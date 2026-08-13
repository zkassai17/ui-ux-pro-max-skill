import { Image, View, Text, StyleSheet } from "react-native";
import { posterUrl } from "../lib/tmdbNormalize";

export function PosterImage({
  path,
  width,
  height,
  radius = 8,
}: {
  path: string | null;
  width: number;
  height: number;
  radius?: number;
}) {
  const uri = posterUrl(path);
  if (!uri) {
    return (
      <View style={[styles.placeholder, { width, height, borderRadius: radius }]}>
        <Text style={styles.placeholderText}>No image</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width, height, borderRadius: radius }} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: "#e6e6ef", alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 9, color: "#9a9aab" },
});
