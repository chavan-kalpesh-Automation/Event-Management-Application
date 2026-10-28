import { Platform, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/src/theme";

export function ScreenHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "flex-end" },
  eyebrow: { color: colors.brandSecondary, fontSize: 11, letterSpacing: 2, fontWeight: "700", marginBottom: 4 },
  title: {
    color: colors.onSurface,
    fontSize: 32,
    fontWeight: "500",
    fontFamily: Platform.select({ ios: typography.display, default: undefined }),
  },
});
