import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Easing,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLibrary, addToLibrary } from "../src/services/watchlist";
import { getHiddenKeys, hideRec } from "../src/services/hiddenRecs";
import { getSwipeDeck } from "../src/services/swipe";
import { getTitleDetails } from "../src/services/tmdb";
import { titleKey } from "../src/lib/forYouLogic";
import { PosterImage } from "../src/components/PosterImage";
import { PressableScale } from "../src/components/PressableScale";
import { useI18n } from "../src/i18n/I18nProvider";
import { ACCENT, HEADING } from "../src/theme";
import type { Title, TitleDetail } from "../src/types/tmdb";

const { width, height } = Dimensions.get("window");
// Wider + a touch taller than a natural 2:3 poster so the card fills more of the
// screen (poster cover-crops slightly); still bounded by screen height on small
// devices. Buttons stay below the card.
const CARD_W = width - 28;
const CARD_H = Math.min(CARD_W * 1.6, height * 0.68);
const SWIPE_X = width * 0.26;
const SWIPE_Y = height * 0.16;

type Dir = "right" | "left" | "up";
type IconName = ComponentProps<typeof Ionicons>["name"];

// One line in the first-run "how it works" card.
function CoachRow({ icon, color, text }: { icon: IconName; color: string; text: string }) {
  return (
    <View style={styles.coachRow}>
      <View style={[styles.coachIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.coachText}>{text}</Text>
    </View>
  );
}

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

// The back of the card — the info you'd otherwise get on the detail page.
function CardBack({ title, detail, loading }: { title: Title; detail?: TitleDetail; loading: boolean }) {
  const { t } = useI18n();
  return (
    <View style={styles.backInner}>
      <Text style={styles.backTitle} numberOfLines={2}>{title.title}</Text>
      <Text style={styles.backMeta}>
        {title.mediaType === "movie" ? t("media.movie") : t("media.tv")}
        {title.year ? ` · ${title.year}` : ""}
        {title.rating ? `  ⭐ ${title.rating}` : ""}
      </Text>
      {detail?.genres?.length ? (
        <Text style={styles.backGenres}>{detail.genres.slice(0, 4).join("  ·  ")}</Text>
      ) : null}
      {loading && !detail ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#fff" />
      ) : (
        <Text style={styles.backOverview} numberOfLines={14}>
          {detail?.overview?.trim() ? detail.overview : t("swipe.noOverview")}
        </Text>
      )}
      <Text style={styles.backHint}>{t("swipe.flipHint")}</Text>
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
  // Idle "float": the resting card gently bobs up and down on its own.
  const float = useRef(new Animated.Value(0)).current;
  // "Lift": grows the card + deepens its shadow while you're holding it, so it
  // feels like you picked it up off the stack (settles back on release).
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -7, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(float, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  // Card flip: tapping the card turns it over to show details on the back
  // (instead of navigating to a whole new page). `flip` 0 = front, 1 = back.
  const flip = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const flippedRef = useRef(false);
  function doFlip(toBack: boolean) {
    flippedRef.current = toBack;
    setFlipped(toBack);
    Animated.spring(flip, { toValue: toBack ? 1 : 0, useNativeDriver: true, speed: 12, bounciness: 7 }).start();
  }
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  // Refs so the PanResponder (created once) always reads current values.
  const cardsRef = useRef<Title[]>(cards);
  const indexRef = useRef(index);
  cardsRef.current = cards;
  indexRef.current = index;

  function act(dir: Dir, card: Title) {
    if (dir === "right") addToLibrary(card, "want").catch(() => {});
    else if (dir === "up") addToLibrary(card, "watched").catch(() => {});
    else hideRec(card).catch(() => {});
    // Advance the deck. The position + scale reset happens in the layout effect
    // below (keyed on `index`), NOT here — if we reset the shared position now,
    // the reused card view would snap to center while still showing the old
    // poster for one painted frame (the "glitch" flash).
    setIndex((i) => i + 1);
    qc.invalidateQueries({ queryKey: ["library"] });
    if (dir === "left") qc.invalidateQueries({ queryKey: ["hidden-recs"] });
  }

  // Snap the freshly-promoted top card to center and give it a subtle deal-in.
  // useLayoutEffect runs after the new card has rendered but BEFORE the frame is
  // painted, so the position reset is never visible on screen.
  useLayoutEffect(() => {
    position.setValue({ x: 0, y: 0 });
    topScale.setValue(0.96);
    Animated.spring(topScale, { toValue: 1, useNativeDriver: false, speed: 22, bounciness: 5 }).start();
    // A new card always starts on its front (poster) side.
    flip.setValue(0);
    flippedRef.current = false;
    setFlipped(false);
  }, [index, position, topScale, flip]);

  // Details for the back of the current card — fetched only once it's flipped.
  const activeCard = cards[index];
  const details = useQuery({
    queryKey: ["title-detail", activeCard?.mediaType, activeCard?.tmdbId],
    enabled: !!activeCard && flipped,
    staleTime: 30 * 60 * 1000,
    queryFn: () => getTitleDetails(activeCard!.mediaType, activeCard!.tmdbId),
  });

  // First-run coach card: show the "how it works" overlay once, then remember it.
  const [coached, setCoached] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem("swipe:coached").then((v) => setCoached(v === "1")).catch(() => setCoached(true));
  }, []);
  function dismissCoach() {
    setCoached(true);
    AsyncStorage.setItem("swipe:coached", "1").catch(() => {});
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

  const setLift = (toValue: number) =>
    Animated.spring(lift, { toValue, useNativeDriver: false, speed: 30, bounciness: 4 }).start();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Don't drag while the card is flipped (info side) — a tap flips it back.
      onMoveShouldSetPanResponder: (_e, g) => !flippedRef.current && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
      onPanResponderGrant: () => { if (!flippedRef.current) setLift(1); }, // pick the card up
      onPanResponderMove: (_e, g) => position.setValue({ x: g.dx, y: g.dy }),
      onPanResponderTerminate: () => setLift(0),
      onPanResponderRelease: (_e, g) => {
        setLift(0); // set it back down
        const card = cardsRef.current[indexRef.current];
        if (!card) return;
        const isTap = Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5;
        // Tap the card to flip it over (front poster <-> back details).
        if (flippedRef.current) {
          if (isTap) doFlip(false);
          else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          return;
        }
        if (isTap) { doFlip(true); return; }
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

  // Top-card motion: pan + idle float on translateY, deal-in * grab-lift on scale,
  // and a shadow that deepens while the card is held (the "picked up" feel).
  const cardTranslateY = Animated.add(position.y, float);
  const cardScale = Animated.multiply(topScale, lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }));
  const cardShadow = {
    shadowOpacity: lift.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] }),
    shadowRadius: lift.interpolate({ inputRange: [0, 1], outputRange: [12, 24] }),
    elevation: lift.interpolate({ inputRange: [0, 1], outputRange: [8, 18] }),
  };

  const current = cards[index];
  const next = cards[index + 1];
  const loading = !built.current;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          // Title + a tappable ⓘ that reopens the "how it works" card anytime.
          headerTitle: () => (
            <Pressable onPress={() => setCoached(false)} hitSlop={8} style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>{t("swipe.title")}</Text>
              <Ionicons name="information-circle-outline" size={20} color="#9a9aab" />
            </Pressable>
          ),
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
              style={[
                styles.card,
                cardShadow,
                { transform: [{ translateX: position.x }, { translateY: cardTranslateY }, { rotate }, { scale: cardScale }] },
              ]}
              {...panResponder.panHandlers}
            >
              {/* Front (poster) — flips away when the card is turned over. */}
              <Animated.View style={[styles.face, { transform: [{ perspective: 1200 }, { rotateY: frontRotate }] }]}>
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
              {/* Back (details) */}
              <Animated.View
                style={[styles.face, styles.faceBack, { transform: [{ perspective: 1200 }, { rotateY: backRotate }] }]}
              >
                <CardBack title={current} detail={details.data} loading={details.isLoading} />
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
        </>
      )}

      {/* "How it works" overlay — shown once on first run, and any time the user
          taps the ⓘ in the header. Dismiss remembers it via AsyncStorage. */}
      {coached === false ? (
        <View style={styles.coach}>
          <View style={styles.coachCard}>
            <Text style={styles.coachTitle}>{t("swipe.coachTitle")}</Text>
            <CoachRow icon="arrow-forward" color="#12b886" text={t("swipe.coachRight")} />
            <CoachRow icon="arrow-back" color="#ff3b5b" text={t("swipe.coachLeft")} />
            <CoachRow icon="arrow-up" color="#5b6cff" text={t("swipe.coachUp")} />
            <CoachRow icon="hand-left-outline" color="#888" text={t("swipe.coachTap")} />
            <Pressable style={styles.coachBtn} onPress={dismissCoach}>
              <Text style={styles.coachBtnText}>{t("swipe.coachGotIt")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  card: {
    position: "absolute",
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    backgroundColor: "#eee",
    // Resting shadow so the card always looks lifted off the background. The top
    // card animates this deeper while held (see cardShadow).
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  cardBehind: { transform: [{ scale: 0.94 }, { translateY: 14 }], shadowOpacity: 0.1, elevation: 4 },
  // The two flip faces stack on top of each other; backfaceVisibility hides
  // whichever one is currently turned away from the viewer.
  face: { position: "absolute", top: 0, left: 0, width: CARD_W, height: CARD_H, borderRadius: 18, overflow: "hidden", backfaceVisibility: "hidden", backgroundColor: "#111" },
  faceBack: { backgroundColor: "#16161d" },
  backInner: { flex: 1, padding: 22 },
  backTitle: { color: "#fff", fontFamily: HEADING, fontSize: 23, lineHeight: 28 },
  backMeta: { color: "#c9c9d6", fontSize: 13, fontWeight: "700", marginTop: 8 },
  backGenres: { color: "#8ea2ff", fontSize: 13, fontWeight: "700", marginTop: 12 },
  backOverview: { color: "#d7d7df", fontSize: 15, lineHeight: 22, marginTop: 14 },
  backHint: { position: "absolute", left: 22, right: 22, bottom: 18, textAlign: "center", color: "#6f6f7e", fontSize: 12, fontWeight: "700" },
  cardInner: { width: CARD_W, height: CARD_H, borderRadius: 18, overflow: "hidden", backgroundColor: "#111" },
  cardFooter: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "rgba(0,0,0,0.55)" },
  cardTitle: { color: "#fff", fontSize: 20, fontFamily: HEADING },
  cardMeta: { color: "#e5e5e5", fontSize: 13, marginTop: 4, fontWeight: "600" },

  // Swipe indicators sit around the vertical middle of the card so they're clearly
  // visible over the artwork instead of crammed against the top edge / notch.
  stamp: { position: "absolute", top: "42%", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 3, backgroundColor: "rgba(0,0,0,0.4)" },
  stampLike: { right: 20, borderColor: "#1dd1a1", transform: [{ rotate: "12deg" }] },
  stampLikeText: { color: "#1dd1a1", fontSize: 24, fontWeight: "900", letterSpacing: 1 },
  stampNope: { left: 20, borderColor: "#ff3b5b", transform: [{ rotate: "-12deg" }] },
  stampNopeText: { color: "#ff3b5b", fontSize: 24, fontWeight: "900", letterSpacing: 1 },
  stampSeen: { alignSelf: "center", left: 0, right: 0, marginHorizontal: "auto", borderColor: "#5b6cff", alignItems: "center" },
  stampSeenText: { color: "#5b6cff", fontSize: 24, fontWeight: "900", letterSpacing: 1 },

  // Tighter spacing below the card so there's no dead gap before the buttons.
  actions: { flexDirection: "row", justifyContent: "center", gap: 30, paddingVertical: 8, marginTop: 6 },
  actionCol: { alignItems: "center", gap: 6 },
  actionBtn: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#eee", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  actionLabel: { fontSize: 12, fontWeight: "800" },

  headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontFamily: HEADING, fontSize: 18, color: "#111" },

  coach: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(17,17,17,0.72)", alignItems: "center", justifyContent: "center", padding: 28 },
  coachCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360 },
  coachTitle: { fontFamily: HEADING, fontSize: 20, color: "#111", marginBottom: 12, textAlign: "center" },
  coachRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 9 },
  coachIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  coachText: { flex: 1, fontSize: 15, color: "#333", fontWeight: "600" },
  coachBtn: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  coachBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
