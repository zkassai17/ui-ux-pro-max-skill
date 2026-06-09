import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { PosterImage } from "./PosterImage";
import type { TasteMatch } from "../lib/tasteMatchLogic";
import type { WatchlistEntry } from "../types/db";

// Color the percentage on a cold→warm scale so the number reads at a glance.
function scoreColor(score: number): string {
  if (score >= 80) return "#1dd1a1";
  if (score >= 60) return "#5b6cff";
  if (score >= 40) return "#ffc048";
  return "#ff9f43";
}

export function TasteMatchCard({ match, username }: { match: TasteMatch; username?: string }) {
  const router = useRouter();
  const name = username ? `@${username}` : "them";

  if (match.score == null) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>Taste match</Text>
        <Text style={styles.hint}>
          {match.coWatched > 0
            ? `You've both watched ${match.coWatched} of the same ${
                match.coWatched === 1 ? "title" : "titles"
              }. Watch a few more in common to unlock your match.`
            : `Watch some of the same titles as ${name} to unlock your taste match.`}
        </Text>
      </View>
    );
  }

  const color = scoreColor(match.score);

  // Prefer the "you both love" list; fall back to "you've both seen".
  const loveFavs = match.sharedFavorites.slice(0, 4);
  const seenFavs = match.alsoBothWatched.slice(0, 4);
  const favHead = loveFavs.length > 0 ? "You both love" : "You've both seen";
  const favs: WatchlistEntry[] = loveFavs.length > 0 ? loveFavs : seenFavs;

  const sub =
    match.basis === "blend"
      ? `across ${match.coWatched} watched · ${match.coRated} rated`
      : `across ${match.coWatched} watched in common`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.heading}>Taste match</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
        <Text style={[styles.score, { color }]}>{match.score}%</Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${match.score}%`, backgroundColor: color }]} />
      </View>

      {match.basis === "history" ? (
        <Text style={styles.note}>Rate titles you've both seen to sharpen this.</Text>
      ) : null}

      {favs.length > 0 ? (
        <View style={styles.favWrap}>
          <Text style={styles.favHead}>{favHead}</Text>
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
  topLeft: { flex: 1, minWidth: 0 },
  heading: { fontSize: 14, fontWeight: "800" },
  sub: { fontSize: 11, color: "#999", marginTop: 2 },
  score: { fontSize: 30, fontWeight: "900", marginLeft: 12 },
  hint: { fontSize: 12, color: "#888", marginTop: 6, lineHeight: 17 },
  note: { fontSize: 11, color: "#aaa", marginTop: 8 },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: "#e6e6ee", marginTop: 12, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999 },
  favWrap: { marginTop: 14 },
  favHead: { fontSize: 11, fontWeight: "700", color: "#888", marginBottom: 8 },
  favRow: { flexDirection: "row", gap: 8 },
  fav: { width: 56 },
});
