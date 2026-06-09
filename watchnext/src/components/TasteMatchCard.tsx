import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { PosterImage } from "./PosterImage";
import type { TasteMatch } from "../lib/tasteMatchLogic";

// Color the percentage on a cold→warm scale so the number reads at a glance.
function scoreColor(score: number): string {
  if (score >= 80) return "#1dd1a1";
  if (score >= 60) return "#5b6cff";
  if (score >= 40) return "#ffc048";
  return "#ff9f43";
}

export function TasteMatchCard({ match, username }: { match: TasteMatch; username?: string }) {
  const router = useRouter();
  const name = username ? `@${username}` : "they";

  if (match.score == null) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>Taste match</Text>
        <Text style={styles.hint}>
          Not enough overlap yet. Rate a few titles {name} has also rated to unlock your match
          {match.coRated > 0 ? ` (${match.coRated} so far)` : ""}.
        </Text>
      </View>
    );
  }

  const color = scoreColor(match.score);
  const favs = match.sharedFavorites.slice(0, 4);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.heading}>Taste match</Text>
          <Text style={styles.sub}>across {match.coRated} rated titles</Text>
        </View>
        <Text style={[styles.score, { color }]}>{match.score}%</Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${match.score}%`, backgroundColor: color }]} />
      </View>

      {favs.length > 0 ? (
        <View style={styles.favWrap}>
          <Text style={styles.favHead}>You both love</Text>
          <View style={styles.favRow}>
            {favs.map((e) => (
              <Pressable
                key={e.id}
                style={styles.fav}
                onPress={() => router.push(`/title/${e.media_type}/${e.tmdb_id}`)}
              >
                <PosterImage path={e.poster_path} width={56} height={84} radius={8} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#f7f7fa", borderRadius: 16, padding: 16, marginTop: 16 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { fontSize: 14, fontWeight: "800" },
  sub: { fontSize: 11, color: "#999", marginTop: 2 },
  score: { fontSize: 30, fontWeight: "900" },
  hint: { fontSize: 12, color: "#888", marginTop: 6, lineHeight: 17 },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: "#e6e6ee", marginTop: 12, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999 },
  favWrap: { marginTop: 14 },
  favHead: { fontSize: 11, fontWeight: "700", color: "#888", marginBottom: 8 },
  favRow: { flexDirection: "row", gap: 8 },
  fav: { width: 56 },
});
