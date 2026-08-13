import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { HEADING } from "../theme";
import { LEGAL_UPDATED, type LegalSection } from "../legal/legalText";

// Renders a legal document (Terms or Privacy) as scrollable sections.
export function LegalDoc({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated {LEGAL_UPDATED}</Text>
        {sections.map((s) => (
          <View key={s.h} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            {s.p.map((para, i) => (
              <Text key={i} style={styles.p}>{para}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 48 },
  updated: { fontSize: 12, color: "#999", marginBottom: 18 },
  section: { marginBottom: 20 },
  h: { fontFamily: HEADING, fontSize: 16, color: "#111", marginBottom: 8 },
  p: { fontSize: 14.5, lineHeight: 22, color: "#444", marginBottom: 10 },
});
