import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLibrary, addToLibrary } from "../src/services/watchlist";
import { getHiddenKeys, hideRec } from "../src/services/hiddenRecs";
import { getSwipeDeck } from "../src/services/swipe";
import { titleKey } from "../src/lib/forYouLogic";
import { PosterImage } from "../src/components/PosterImage";
import { PressableScale } from "../src/components/PressableScale";
import { useI18n } from "../src/i18n/I18nProvider";
import { ACCENT, HEADING } from "../src/theme";
import type { Title } from "../src/types/tmdb";

const { width, height } = Dimensions.get("window");
const CARD_W = width - 40;
const CARD_H = Math.min(CARD_W * 1.5, height * 0.62);
const SWIPE_X = width * 0.26;
const SWIPE_Y = height * 0.16;

type Dir = "right" | "left" | "up";

function CardContent({ title }: { title: Title }) {
  const { t } = useI18n();
  return (
    <View style={styles.cardInner}>
      <PosterImage path={title.posterPath} width={CARD_W} height={CARD_H} radius={18} />
      <View style={styles.cardFooter}>
        <Text style={styles.cardTitle} numberOfLines={2}>{title.title}</Text>
        <Text style={styles.cardMeta}>
          {title.mediaType === "movie" ? t("media.movie") : t("media.tv")}
          {title.year ? ` · ${title.year}` : ""}
          {title.rating ? `  ⭐ ${title.rating}` : ""}
        </Text>
      </View>
    </View>
  );
}

export default function SwipeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useI18n();

  const library = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const hidden = useQuery({ queryKey: ["hidden-recs"], queryFn: getHiddenKeys });
  const deck = useQuery({
    queryKey: ["swipe-deck"],
    enabled: !library.isLoading,
    staleTime: 10 * 60 * 1000,
    queryFn: () => getSwipeDeck(library.data ?? []),
  });

  const [index, setIndex] = useState(0);

  // Build the swipe stack ONCE, when the data is ready, and never re-filter it
  // afterward. Previously `cards` was re-derived from the live hidden-recs set on
  // every render — so swiping left (which hides the card and refetches the hidden
  // list) shrank the array and shifted every index a beat later. The poster under
  // your finger would swap to a different title mid-decision. Now we snapshot the
  // deck and advance purely by `index`, so nothing ever moves underneath you.
  const [cards, setCards] = useState<Title[]>([]);
  const built = useRef(false);
  useEffect(() => {
    if (built.current) return;
    if (deck.isLoading || library.isLoading || hidden.isLoading) return;
    const hiddenSet = hidden.data ?? new Set<string>();
    setCards((deck.data ?? []).filter((c) => !hiddenSet.has(titleKey(c))));
    built.current = true;
  }, [deck.isLoading, deck.data, library.isLoading, hidden.isLoading, hidden.data]);

  const position = useRef(new Animated.ValueXY()).current;
  // The incoming card springs up from the "behind" size to full as it becomes
  // the top card — makes the deck feel like it's dealing you the next one.
  const topScale = useRef(new Animated.Value(1)).current;

  // Refs so the PanResponder (created once) always reads current values.
  const cardsRef = useRef<Title[]>(cards);
  const indexRef = useRef(index);
  cardsRef.current = cards;
  indexRef.current = index;

  function act(dir: Dir, card: Title) {
    if (dir === "right") addToLibrary(card, "want").catch(() => {});
    else if (dir === "up") addToLibrary(card, "watched").catch(() => {});
    else hideRec(card).catch(() => {});
    setIndex((i) => i + 1);
    position.setValue({ x: 0, y: 0 });
    topScale.setValue(0.94);
    Animated.spring(topScale, { toValue: 1, useNativeDriver: false, speed: 20, bounciness: 8 }).start();
    qc.invalidateQueries({ queryKey: ["library"] });
    if (dir === "left") qc.invalidateQueries({ queryKey: ["hidden-recs"] });
  }

  function swipeOff(dir: Dir) {
    const card = cardsRef.current[indexRef.current];
    if (!card) return;
    const toValue =
      dir === "right"
        ? { x: width * 1.5, y: 0 }
        : dir === "left"
        ? { x: -width * 1.5, y: 0 }
        : { x: 0, y: -height * 1.2 };
    Animated.timing(position, { toValue, duration: 220, useNativeDriver: false }).start(() => act(dir, card));
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderMove: (_e, g) => position.setValue({ x: g.dx, y: g.dy }),
      onPanResponderRelease: (_e, g) => {
        const card = cardsRef.current[indexRef.current];
        if (!card) return;
        if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
          router.push(`/title/${card.mediaType}/${card.tmdbId}`);
          return;
        }
        if (g.dx > SWIPE_X) swipeOff("right");
        else if (g.dx < -SWIPE_X) swipeOff("left");
        else if (g.dy < -SWIPE_Y) swipeOff("up");
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const rotate = position.x.interpolate({ inputRange: [-width / 2, 0, width / 2], outputRange: ["-8deg", "0deg", "8deg"] });
  const likeOp = position.x.interpolate({ inputRange: [0, SWIPE_X], outputRange: [0, 1], extrapolate: "clamp" });
  const nopeOp = position.x.interpolate({ inputRange: [-SWIPE_X, 0], outputRange: [1, 0], extrapolate: "clamp" });
  const seenOp = position.y.interpolate({ inputRange: [-SWIPE_Y, 0], outputRange: [1, 0], extrapolate: "clamp" });

  const current = cards[index];
  const next = cards[index + 1];
  const loading = !built.current;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("swipe.title"),
          headerRight: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: 12 }}>
              <Text style={styles.done}>{t("swipe.done")}</Text>
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : !current ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-outline" size={44} color="#ccc" />
          <Text style={styles.emptyText}>{t("swipe.empty")}</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.back()}>
            <Text style={styles.emptyBtnText}>{t("swipe.done")}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.deck}>
            {next ? (
              <View style={[styles.card, styles.cardBehind]} pointerEvents="none">
                <CardContent title={next} />
              </View>
            ) : null}
            <Animated.View
              style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }, { scale: topScale }] }]}
              {...panResponder.panHandlers}
            >
              <CardContent title={current} />
              <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOp }]}>
                <Text style={styles.stampLikeText}>{t("swipe.want")}</Text>
              </Animated.View>
              <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOp }]}>
                <Text style={styles.stampNopeText}>{t("swipe.nope")}</Text>
              </Animated.View>
              <Animated.View style={[styles.stamp, styles.stampSeen, { opacity: seenOp }]}>
                <Text style={styles.stampSeenText}>{t("swipe.watched")}</Text>
              </Animated.View>
            </Animated.View>
          </View>

          <View style={styles.actions}>
            <View style={styles.actionCol}>
              <PressableScale style={styles.actionBtn} onPress={() => swipeOff("left")} to={0.88}>
                <Ionicons name="close" size={28} color="#ff3b5b" />
              </PressableScale>
              <Text style={[styles.actionLabel, { color: "#ff3b5b" }]}>{t("swipe.btnSkip")}</Text>
            </View>
            <View style={styles.actionCol}>
              <PressableScale style={styles.actionBtn} onPress={() => swipeOff("up")} to={0.88}>
                <Ionicons name="eye" size={24} color="#5b6cff" />
              </PressableScale>
              <Text style={[styles.actionLabel, { color: "#5b6cff" }]}>{t("swipe.btnSeen")}</Text>
            </View>
            <View style={styles.actionCol}>
              <PressableScale style={styles.actionBtn} onPress={() => swipeOff("right")} to={0.88}>
                <Ionicons name="bookmark" size={24} color="#1dd1a1" />
              </PressableScale>
              <Text style={[styles.actionLabel, { color: "#12b886" }]}>{t("swipe.btnWant")}</Text>
            </View>
          </View>

          <Text style={styles.instr}>{t("swipe.instr")}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 },
  emptyText: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 21 },
  emptyBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  done: { color: ACCENT, fontWeight: "800", fontSize: 15 },

  deck: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { position: "absolute", width: CARD_W, height: CARD_H, borderRadius: 18, backgroundColor: "#eee" },
  cardBehind: { transform: [{ scale: 0.94 }, { translateY: 14 }] },
  cardInner: { width: CARD_W, height: CARD_H, borderRadius: 18, overflow: "hidden", backgroundColor: "#111" },
  cardFooter: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "rgba(0,0,0,0.55)" },
  cardTitle: { color: "#fff", fontSize: 20, fontFamily: HEADING },
  cardMeta: { color: "#e5e5e5", fontSize: 13, marginTop: 4, fontWeight: "600" },

  stamp: { position: "absolute", top: 28, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 3 },
  stampLike: { right: 20, borderColor: "#1dd1a1", transform: [{ rotate: "12deg" }] },
  stampLikeText: { color: "#1dd1a1", fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  stampNope: { left: 20, borderColor: "#ff3b5b", transform: [{ rotate: "-12deg" }] },
  stampNopeText: { color: "#ff3b5b", fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  stampSeen: { alignSelf: "center", left: 0, right: 0, top: 40, marginHorizontal: "auto", borderColor: "#5b6cff", alignItems: "center" },
  stampSeenText: { color: "#5b6cff", fontSize: 22, fontWeight: "900", letterSpacing: 1 },

  actions: { flexDirection: "row", justifyContent: "center", gap: 28, paddingVertical: 10 },
  actionCol: { alignItems: "center", gap: 6 },
  actionBtn: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#eee", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  actionLabel: { fontSize: 12, fontWeight: "800" },
  instr: { textAlign: "center", color: "#aaa", fontSize: 12, paddingBottom: 20, paddingHorizontal: 24, lineHeight: 17 },
});
