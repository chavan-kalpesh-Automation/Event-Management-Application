import FeatherIcon from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/auth";
import { useAuth } from "@/src/auth-context";
import { ScreenHeader } from "@/src/components/screen-header";
import { colors, radius, spacing } from "@/src/theme";

const MODULES: Record<string, { title: string; endpoint: string; ownerOnly?: boolean }> = {
  quotations: { title: "Quotations", endpoint: "/api/quotations" },
  invoices: { title: "Invoices", endpoint: "/api/invoices" },
  inventory: { title: "Inventory", endpoint: "/api/inventory" },
  packages: { title: "Service Packages", endpoint: "/api/packages" },
  followups: { title: "Follow-ups", endpoint: "/api/followups" },
  expenses: { title: "Expenses", endpoint: "/api/expenses", ownerOnly: true },
  reports: { title: "Reports", endpoint: "/api/reports/summary", ownerOnly: true },
  staff: { title: "Staff & Access", endpoint: "/api/users", ownerOnly: true },
};

export default function OperationsModule() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const module = MODULES[section];
  const forbidden = !!module?.ownerOnly && user?.role !== "owner";
  const query = useQuery<any>({ queryKey: ["module", section], queryFn: () => api(module!.endpoint), enabled: !!module && !forbidden });
  const rows = Array.isArray(query.data) ? query.data : query.data && typeof query.data === "object" ? Object.entries(query.data).map(([label, value]) => ({ id: label, label, value })) : [];
  return <View style={styles.container}>
    <View style={{ paddingTop: insets.top + spacing.md }}><ScreenHeader eyebrow="OPERATIONS" title={module?.title ?? "Not found"} right={<Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><FeatherIcon name="arrow-left" size={20} color={colors.onSurface} /></Pressable>} /></View>
    {!module ? <Text style={styles.message}>This section is not available.</Text> : forbidden ? <Text style={styles.message}>This section is available to owners only.</Text> : query.isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} /> : query.isError ? <View style={styles.center}><Text style={styles.error}>{(query.error as Error)?.message ?? "Could not load this section."}</Text><Pressable onPress={() => query.refetch()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View> : rows.length === 0 ? <Text style={styles.message}>No {module.title.toLowerCase()} yet.</Text> : <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
      {rows.map((row: any, index: number) => <View key={row.id ?? row.label ?? index} style={styles.row}>
        <Text style={styles.rowTitle}>{row.label ?? row.name ?? row.title ?? row.customer?.name ?? `${module.title.slice(0, -1)} ${index + 1}`}</Text>
        {Object.entries(row).filter(([key, value]) => key !== "id" && key !== "label" && value != null && typeof value !== "object").slice(0, 4).map(([key, value]) => <Text key={key} style={styles.meta}>{key.replaceAll("_", " ")}: {String(value)}</Text>)}
      </View>)}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.surface }, back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, message: { padding: spacing.xl, textAlign: "center", color: colors.muted }, center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl }, error: { color: colors.error, textAlign: "center" }, retry: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.brandPrimary, borderRadius: radius.md }, retryText: { color: colors.onBrandPrimary, fontWeight: "700" }, row: { backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1, marginBottom: spacing.sm }, rowTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700", marginBottom: spacing.xs }, meta: { color: colors.muted, fontSize: 12, marginTop: 2 } });
