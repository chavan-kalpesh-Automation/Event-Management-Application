import FeatherIcon from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/auth";
import { useAuth } from "@/src/auth-context";
import { ScreenHeader } from "@/src/components/screen-header";
import { colors, radius, spacing } from "@/src/theme";

type Entry = { id: string; label: string; icon: any; href: string; ownerOnly?: boolean };

const ENTRIES: Entry[] = [
  { id: "quotations", label: "Quotations", icon: "file-text", href: "/quotations" },
  { id: "invoices", label: "Invoices", icon: "credit-card", href: "/invoices" },
  { id: "inventory", label: "Inventory", icon: "box", href: "/inventory" },
  { id: "packages", label: "Service Packages", icon: "package", href: "/packages" },
  { id: "followups", label: "Follow-ups", icon: "bell", href: "/followups" },
  { id: "expenses", label: "Expenses", icon: "trending-down", href: "/expenses", ownerOnly: true },
  { id: "reports", label: "Reports", icon: "bar-chart-2", href: "/reports", ownerOnly: true },
  { id: "staff", label: "Staff & Access", icon: "shield", href: "/staff", ownerOnly: true },
];

export default function More() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { data: summary } = useQuery<any>({
    queryKey: ["reports-summary", user?.role],
    queryFn: () => api("/api/reports/summary"),
    enabled: user?.role === "owner",
  });

  const visible = ENTRIES.filter((e) => !e.ownerOnly || user?.role === "owner");

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.md }}>
        <ScreenHeader eyebrow="OPERATIONS" title="More" />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing["2xl"], paddingHorizontal: spacing.lg }}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.full_name?.[0] ?? user?.username?.[0] ?? "?").toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.full_name ?? user?.username}</Text>
            <Text style={styles.profileRole}>{user?.role === "owner" ? "Owner — full access" : "Worker — limited access"}</Text>
          </View>
          <Pressable testID="sign-out" onPress={signOut} style={styles.signOutBtn}>
            <FeatherIcon name="log-out" size={16} color={colors.brandPrimary} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        {user?.role === "owner" && summary ? (
          <View style={styles.summary}>
            <SummaryItem label="Revenue" value={summary.revenue_total} tone="brand" />
            <SummaryItem label="Collected" value={summary.paid_total} tone="success" />
            <SummaryItem label="Outstanding" value={summary.outstanding} tone="warning" />
            <SummaryItem label="Profit" value={summary.profit} tone="secondary" />
          </View>
        ) : null}

        <View style={styles.grid}>
          {visible.map((e) => (
            <Link key={e.id} href={e.href as any} asChild>
              <Pressable testID={`more-${e.id}`} style={styles.tile}>
                <View style={styles.tileIcon}><FeatherIcon name={e.icon} size={20} color={colors.brandPrimary} /></View>
                <Text style={styles.tileLabel}>{e.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryItem({ label, value, tone }: { label: string; value: number; tone: "brand" | "success" | "warning" | "secondary" }) {
  const palette = {
    brand: colors.brandPrimary,
    success: colors.success,
    warning: colors.brandSecondary,
    secondary: colors.info,
  }[tone];
  return (
    <View style={styles.sumItem}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, { color: palette }]}>₹{Math.round(value || 0).toLocaleString("en-IN")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrandPrimary, fontSize: 18, fontWeight: "700" },
  profileName: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  profileRole: { color: colors.muted, fontSize: 12, marginTop: 2 },
  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  signOutText: { color: colors.brandPrimary, fontWeight: "600" },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sumItem: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sumLabel: { color: colors.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  sumValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  tileLabel: { fontSize: 14, color: colors.onSurface, fontWeight: "600" },
});
