import FeatherIcon from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/auth";
import { useAuth } from "@/src/auth-context";
import { colors, radius, spacing } from "@/src/theme";
import { WA_TEMPLATES, openWhatsApp } from "@/src/whatsapp";

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<any>({ queryKey: ["customer", id], queryFn: () => api(`/api/customers/${id}`) });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  }
  if (isError || !data) {
    return <View style={styles.center}><Text style={styles.loadError}>{(error as Error)?.message ?? "Could not load this customer."}</Text><Pressable onPress={() => refetch()} disabled={isRefetching} style={styles.retry}><Text style={styles.retryText}>{isRefetching ? "Retrying…" : "Try again"}</Text></Pressable></View>;
  }
  const c = data.customer;

  const shareHello = () => openWhatsApp(c.mobile, `Namaste ${c.name}, this is Mauli Events. How may we help you today?`);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back" onPress={() => router.back()} style={styles.iconBtn}>
          <FeatherIcon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{c.name}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}>
        <View style={styles.card}>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.meta}>{c.mobile}</Text>
          {c.address ? <Text style={styles.meta}>{c.address}</Text> : null}
          {c.email ? <Text style={styles.meta}>{c.email}</Text> : null}
          {c.referral_source ? <Text style={styles.meta}>Referral: {c.referral_source}</Text> : null}
          {c.notes ? <Text style={styles.meta}>{c.notes}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable testID="wa-hello" onPress={shareHello} style={[styles.actionBtn, { backgroundColor: colors.success }]}>
            <FeatherIcon name="message-circle" size={18} color="#FFF" />
            <Text style={styles.actionText}>WhatsApp</Text>
          </Pressable>
          <Pressable
            testID="new-booking"
            onPress={() => router.push({ pathname: "/booking/new", params: { customerId: c.id } })}
            style={[styles.actionBtn, { backgroundColor: colors.brandPrimary }]}
          >
            <FeatherIcon name="plus" size={18} color="#FFF" />
            <Text style={styles.actionText}>Booking</Text>
          </Pressable>
        </View>

        <SectionTitle>Bookings</SectionTitle>
        {data.bookings?.length ? data.bookings.map((b: any) => (
          <Pressable key={b.id} onPress={() => router.push({ pathname: "/booking/[id]", params: { id: b.id } })} style={styles.listRow} testID={`cust-booking-${b.id}`}>
            <View style={[styles.stripe, { backgroundColor: b.status === "confirmed" ? colors.success : b.status === "blocked" ? colors.error : colors.brandSecondary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{b.event_type} • {new Date(b.start_at).toLocaleDateString()}</Text>
              <Text style={styles.rowMeta}>{b.venue || "—"} · {b.status}</Text>
            </View>
          </Pressable>
        )) : <Text style={styles.empty}>No bookings yet.</Text>}

        {user?.role === "owner" ? (
          <>
            <SectionTitle>Invoices</SectionTitle>
            {data.invoices?.length ? data.invoices.map((inv: any) => (
              <View key={inv.id} style={styles.listRow}>
                <View style={[styles.stripe, { backgroundColor: colors.brandPrimary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{inv.title} · ₹{Math.round(inv.total || 0).toLocaleString("en-IN")}</Text>
                  <Text style={styles.rowMeta}>Paid ₹{Math.round(inv.paid || 0).toLocaleString("en-IN")}</Text>
                </View>
              </View>
            )) : <Text style={styles.empty}>No invoices yet.</Text>}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  loadError: { color: colors.error, textAlign: "center", marginHorizontal: spacing.xl },
  retry: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.brandPrimary },
  retryText: { color: colors.onBrandPrimary, fontWeight: "700" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, flex: 1, textAlign: "center" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  name: { fontSize: 20, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 4 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  actionBtn: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: radius.md },
  actionText: { color: "#FFF", fontWeight: "700" },
  section: { fontSize: 14, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.sm },
  listRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  stripe: { width: 4, height: 36, borderRadius: 2 },
  rowTitle: { fontSize: 14, color: colors.onSurface, fontWeight: "600" },
  rowMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { color: colors.muted, fontSize: 13 },
});
