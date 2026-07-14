import { Pressable, View, Text, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import { PosterImage } from "./PosterImage";
import { useI18n } from "../i18n/I18nProvider";
import type { MediaType } from "../types/tmdb";

export function TitleRow({
  title,
  subtitle,
  mediaType,
  posterPath,
  onPress,
  accessory,
}: {
  title: string;
  subtitle?: string;
  mediaType: MediaType;
  posterPath: string | null;
  onPress?: () => void;
  accessory?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <PosterImage path={posterPath} width={46} height={68} />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
        <View style={styles.pill}>
          <Text style={styles.pillText}>{mediaType === "movie" ? t("media.movie") : t("media.tv")}</Text>
        </View>
      </View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, color: "#888", marginTop: 2 },
  pill: { alignSelf: "flex-start", marginTop: 4, backgroundColor: "#f5ede7", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  pillText: { fontSize: 9, color: "#b9553c", fontWeight: "600" },
  accessory: { marginLeft: 8 },
});
