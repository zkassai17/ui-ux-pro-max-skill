import { View, Text, Image, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getWatchProviders } from "../services/tmdb";
import { posterUrl } from "../lib/tmdbNormalize";
import { useI18n } from "../i18n/I18nProvider";
import type { Title } from "../types/tmdb";

// Shows where a title streams — prioritising the user's own services (that's the
// whole promise: "you can watch this tonight, on your Netflix"). Provider data is
// cached hard (it changes rarely) so a rail of these stays fast.
export function ProviderBadge({
  title,
  services,
  variant = "poster",
}: {
  title: Title;
  services: number[];
  variant?: "poster" | "hero";
}) {
  const { t } = useI18n();
  const providers = useQuery({
    queryKey: ["watch-providers", title.mediaType, title.tmdbId],
    queryFn: () => getWatchProviders(title.mediaType, title.tmdbId),
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const flat = providers.data?.flatrate ?? [];
  const mine = services.length ? flat.filter((p) => services.includes(p.providerId)) : [];
  const onMine = mine.length > 0;
  const show = (onMine ? mine : flat).slice(0, variant === "hero" ? 3 : 1);
  if (!show.length) return null;

  if (variant === "hero") {
    return (
      <View style={[styles.heroRow, onMine && styles.heroRowMine]}>
        {show.map((p) => {
          const logo = posterUrl(p.logoPath, "w45");
          return logo ? <Image key={p.providerId} source={{ uri: logo }} style={styles.heroLogo} /> : null;
        })}
        <Text style={[styles.heroText, onMine && styles.heroTextMine]} numberOfLines={1}>
          {(onMine ? t("home.onYourService") : t("home.streamingOn")).replace("{name}", show[0].name)}
        </Text>
      </View>
    );
  }

  const p = show[0];
  const logo = posterUrl(p.logoPath, "w45");
  if (!logo) return null;
  return (
    <View style={[styles.posterBadge, onMine && styles.posterBadgeMine]}>
      <Image source={{ uri: logo }} style={styles.posterLogo} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Corner badge on a poster.
  posterBadge: { position: "absolute", top: 6, left: 6, borderRadius: 7, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.9)" },
  posterBadgeMine: { borderColor: "#12b886" },
  posterLogo: { width: 24, height: 24 },

  // Labelled row for the Tonight hero.
  heroRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "flex-start", backgroundColor: "#f0f0f3", borderRadius: 999, paddingLeft: 6, paddingRight: 10, paddingVertical: 4 },
  heroRowMine: { backgroundColor: "#e6f8f1" },
  heroLogo: { width: 20, height: 20, borderRadius: 5 },
  heroText: { fontSize: 12, fontWeight: "700", color: "#555" },
  heroTextMine: { color: "#0b8f68" },
});
