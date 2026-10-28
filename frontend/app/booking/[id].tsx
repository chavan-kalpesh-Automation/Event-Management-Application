import FeatherIcon from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/auth";
import { ScreenHeader } from "@/src/components/screen-header";
import { colors, radius, spacing } from "@/src/theme";

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<any>({
    queryKey: ["booking", id], queryFn: () => api(`/api/bookings/${encodeURIComponent(id)}`), enabled: !!id,
  });
  return <View style={styles.container}>
    <View style={{ paddingTop: insets.top + spacing.md }}>
      <ScreenHeader eyebrow="BOOKING DETAILS" title={data?.event_type ?? "Booking"} right={<Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><FeatherIcon name="arrow-left" size={20} color={colors.onSurface} /></Pressable>} />
    </View>
    {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} /> : isError ? <View style={styles.center}><Text style={styles.message}>{(error as Error)?.message ?? "Could not load this booking."}</Text><Pressable onPress={() => refetch()} disabled={isRefetching} style={styles.retry}><Text style={styles.retryText}>{isRefetching ? "Retrying…" : "Try again"}</Text></Pressable></View> : data ? <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
      <View style={styles.card}>
        <Detail label="Customer" value={data.customer?.name ?? "Customer"} />
        {data.customer?.mobile ? <Detail label="Mobile" value={data.customer.mobile} /> : null}
        <Detail label="Status" value={data.status} />
        <Detail label="Start" value={new Date(data.start_at).toLocaleString()} />
        <Detail label="End" value={new Date(data.end_at).toLocaleString()} />
        {data.venue ? <Detail label="Venue" value={data.venue} /> : null}
        {data.guests ? <Detail label="Guests" value={String(data.guests)} /> : null}
        <Detail label="Total" value={`₹${Math.round(data.total_amount || 0).toLocaleString("en-IN")}`} />
        {data.notes ? <Detail label="Notes" value={data.notes} /> : null}
      </View>
    </ScrollView> : null}
  </View>;
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface }, back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }, message: { color: colors.error, textAlign: "center" },
  retry: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.brandPrimary }, retryText: { color: colors.onBrandPrimary, fontWeight: "700" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  detail: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, label: { color: colors.muted, fontSize: 12, fontWeight: "600" }, value: { color: colors.onSurface, fontSize: 15, marginTop: spacing.xs, textTransform: "capitalize" },
});
