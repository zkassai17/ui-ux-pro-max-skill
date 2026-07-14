import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { usePro } from "../src/pro/ProProvider";
import { PRO_PLANS, type ProPlan } from "../src/lib/proGates";
import { useI18n } from "../src/i18n/I18nProvider";

import { HEADING } from "../src/theme";
// Only features that are actually built and delivered — so the purchase
// unlocks exactly what's advertised (App Store Guideline 2.3.1 / 3.1.1).
const FEATURES = [
  "pro.feature.blend",
  "pro.feature.friends",
  "pro.feature.insights",
  "pro.feature.tuning",
];

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { isPro, startPurchase, restore } = usePro();
  const [selected, setSelected] = useState<ProPlan["id"]>(
    PRO_PLANS.find((p) => p.bestValue)?.id ?? PRO_PLANS[0].id
  );
  const [busy, setBusy] = useState(false);

  async function buy() {
    const plan = PRO_PLANS.find((p) => p.id === selected);
    if (!plan) return;
    setBusy(true);
    try {
      await startPurchase(plan);
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    setBusy(true);
    try {
      await restore();
    } finally {
      setBusy(false);
    }
  }

  // Already Pro — celebratory, self-contained state.
  if (isPro) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: true, title: t("pro.title"), headerBackTitle: "" }} />
        <View style={styles.doneWrap}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>{t("pro.unlockedTitle")}</Text>
          <Text style={styles.doneBody}>{t("pro.unlockedBody")}</Text>
          <Pressable style={styles.cta} onPress={() => router.back()}>
            <Text style={styles.ctaText}>{t("pro.continue")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: t("pro.title"), headerBackTitle: "" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.crown}>✦</Text>
          <Text style={styles.heroTitle}>{t("pro.title")}</Text>
          <Text style={styles.heroTagline}>{t("pro.tagline")}</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((key) => (
            <View key={key} style={styles.featureRow}>
              <View style={styles.check}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.featureText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plans}>
          {PRO_PLANS.map((plan) => {
            const on = selected === plan.id;
            return (
              <Pressable
                key={plan.id}
                style={[styles.plan, on && styles.planOn]}
                onPress={() => setSelected(plan.id)}
              >
                {plan.bestValue ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t("pro.bestValue")}</Text>
                  </View>
                ) : null}
                <View style={styles.planLeft}>
                  <View style={[styles.radio, on && styles.radioOn]}>
                    {on ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={[styles.planName, on && styles.planNameOn]}>
                    {t(`pro.plan.${plan.id}`)}
                  </Text>
                </View>
                <View style={styles.planPriceWrap}>
                  <Text style={[styles.planPrice, on && styles.planNameOn]}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* CTA */}
        <Pressable style={styles.cta} onPress={buy} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>{t("pro.cta")}</Text>
          )}
        </Pressable>

        <Pressable onPress={onRestore} disabled={busy} hitSlop={8} style={styles.restore}>
          <Text style={styles.restoreText}>{t("pro.restore")}</Text>
        </Pressable>

        <Text style={styles.legal}>{t("pro.legal")}</Text>
        {__DEV__ ? <Text style={styles.devNote}>{t("pro.devNote")}</Text> : null}

        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.later}>
          <Text style={styles.laterText}>{t("pro.maybeLater")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const ACCENT = "#5b6cff";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 20, paddingBottom: 40 },

  hero: { alignItems: "center", paddingVertical: 18 },
  crown: { fontSize: 34, color: ACCENT, marginBottom: 6 },
  heroTitle: { fontFamily: HEADING, fontSize: 26, fontWeight: "900", color: "#111", letterSpacing: -0.5 },
  heroTagline: { fontSize: 14, color: "#888", marginTop: 6, fontWeight: "600" },

  features: { backgroundColor: "#f7f7fb", borderRadius: 16, padding: 16, gap: 14, marginTop: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "900" },
  featureText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#222" },

  plans: { marginTop: 22, gap: 10 },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "#e8e8ee",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  planOn: { borderColor: ACCENT, backgroundColor: "#f3f4ff" },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: ACCENT },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: ACCENT },
  planName: { fontSize: 16, fontWeight: "700", color: "#555" },
  planNameOn: { color: "#111" },
  planPriceWrap: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  planPrice: { fontSize: 17, fontWeight: "900", color: "#555" },
  planPeriod: { fontSize: 12, color: "#999", fontWeight: "600" },
  badge: { position: "absolute", top: -10, right: 14, backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },

  cta: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24, minHeight: 54, justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  restore: { alignItems: "center", paddingVertical: 14 },
  restoreText: { color: ACCENT, fontSize: 14, fontWeight: "700" },
  legal: { fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 6, lineHeight: 15 },
  devNote: { fontSize: 11, color: "#c99", textAlign: "center", marginTop: 6, fontWeight: "700" },
  later: { alignItems: "center", paddingVertical: 16 },
  laterText: { color: "#999", fontSize: 14, fontWeight: "600" },

  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  doneEmoji: { fontSize: 56, marginBottom: 12 },
  doneTitle: { fontFamily: HEADING, fontSize: 24, fontWeight: "900", color: "#111" },
  doneBody: { fontSize: 15, color: "#666", textAlign: "center", marginTop: 10, lineHeight: 21 },
});
