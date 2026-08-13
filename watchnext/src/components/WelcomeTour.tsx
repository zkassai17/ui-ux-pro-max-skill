import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n } from "../i18n/I18nProvider";
import { ACCENT, HEADING } from "../theme";

const { width } = Dimensions.get("window");
const SEEN_KEY = "welcome:seen:v1";
const PAGES = 3;

type IconName = ComponentProps<typeof Ionicons>["name"];

// The five tabs, each mapped to its real tab-bar icon + a one-line "what it's for".
const TABS: { icon: IconName; nameKey: string; descKey: string; color: string }[] = [
  { icon: "home", nameKey: "tab.home", descKey: "welcome.homeDesc", color: "#5b6cff" },
  { icon: "bookmark", nameKey: "tab.library", descKey: "welcome.libraryDesc", color: "#12b886" },
  { icon: "add-circle", nameKey: "tab.add", descKey: "welcome.addDesc", color: "#f5a623" },
  { icon: "sparkles", nameKey: "tab.together", descKey: "welcome.togetherDesc", color: "#ff5470" },
  { icon: "person", nameKey: "tab.profile", descKey: "welcome.profileDesc", color: "#8a5cff" },
];

// A one-time welcome tour: what watchnext does, what each tab is for, and a couple
// of tips. Shown once (remembered on-device) the first time a user reaches Home.
export function WelcomeTour() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => { if (v !== "1") setVisible(true); })
      .catch(() => {});
  }, []);

  function done() {
    setVisible(false);
    AsyncStorage.setItem(SEEN_KEY, "1").catch(() => {});
  }
  function next() {
    if (page >= PAGES - 1) return done();
    const p = page + 1;
    scroller.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={done}>
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.skip} onPress={done} hitSlop={10}>
          <Text style={styles.skipText}>{t("welcome.skip")}</Text>
        </Pressable>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {/* 1 — what it is */}
          <View style={[styles.page, { width }]}>
            <View style={styles.hero}>
              <Ionicons name="play" size={44} color="#fff" />
            </View>
            <Text style={styles.title}>{t("welcome.title")}</Text>
            <Text style={styles.body}>{t("welcome.subtitle")}</Text>
          </View>

          {/* 2 — what each tab does */}
          <View style={[styles.page, { width }]}>
            <Text style={styles.title}>{t("welcome.tabsTitle")}</Text>
            <View style={styles.list}>
              {TABS.map((tab) => (
                <View key={tab.nameKey} style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: `${tab.color}1a` }]}>
                    <Ionicons name={tab.icon} size={22} color={tab.color} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{t(tab.nameKey)}</Text>
                    <Text style={styles.rowDesc}>{t(tab.descKey)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 3 — quick tips */}
          <View style={[styles.page, { width }]}>
            <Text style={styles.title}>{t("welcome.tipsTitle")}</Text>
            <View style={styles.list}>
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: "#e6f8f1" }]}>
                  <Ionicons name="tv-outline" size={22} color="#12b886" />
                </View>
                <Text style={styles.tip}>{t("welcome.tip1")}</Text>
              </View>
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: "#eef0ff" }]}>
                  <Ionicons name="albums-outline" size={22} color={ACCENT} />
                </View>
                <Text style={styles.tip}>{t("welcome.tip2")}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.dots}>
          {Array.from({ length: PAGES }, (_, i) => (
            <View key={i} style={[styles.dot, page === i && styles.dotOn]} />
          ))}
        </View>

        <Pressable style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>{page >= PAGES - 1 ? t("welcome.getStarted") : t("welcome.next")}</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  skip: { position: "absolute", top: 8, right: 16, zIndex: 2, padding: 8 },
  skipText: { fontSize: 15, fontWeight: "700", color: "#9a9aab" },

  page: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  hero: { width: 84, height: 84, borderRadius: 24, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontFamily: HEADING, fontSize: 26, color: "#111", textAlign: "center", letterSpacing: -0.4 },
  body: { fontSize: 16, color: "#666", textAlign: "center", lineHeight: 24, marginTop: 12, maxWidth: 320 },

  list: { alignSelf: "stretch", marginTop: 26, gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  rowIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flex: 0 },
  rowText: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: "800", color: "#111" },
  rowDesc: { fontSize: 13.5, color: "#777", marginTop: 2, lineHeight: 18 },
  tip: { flex: 1, fontSize: 15, color: "#444", lineHeight: 21 },

  dots: { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e2e2ea" },
  dotOn: { backgroundColor: ACCENT, width: 22 },

  cta: { backgroundColor: ACCENT, borderRadius: 16, height: 54, alignItems: "center", justifyContent: "center", marginHorizontal: 24, marginBottom: 12 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
