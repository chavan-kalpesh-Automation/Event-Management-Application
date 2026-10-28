import FeatherIcon from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/auth";
import { useAuth } from "@/src/auth-context";
import { ScreenHeader } from "@/src/components/screen-header";
import { colors, radius, spacing, typography } from "@/src/theme";

type Dash = {
  stats: Record<string, number>;
  today_events: any[];
  upcoming: any[];
};

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<Dash>({
    queryKey: ["dashboard"],
    queryFn: () => api<Dash>("/api/dashboard"),
  });

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.md }}>
        <ScreenHeader
          eyebrow={`Welcome back, ${user?.full_name ?? user?.username}`}
          title="Today"
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{(error as Error)?.message ?? "Could not load the dashboard."}</Text>
          <Pressable onPress={() => refetch()} disabled={isRefetching} style={styles.retry}>
            <Text style={styles.retryText}>{isRefetching ? "Retrying…" : "Try again"}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing["2xl"] }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
            <StatCard label="Today" value={String(data?.stats.today_events ?? 0)} icon="calendar" tone="brand" />
            <StatCard label="Enquiries" value={String(data?.stats.enquiries ?? 0)} icon="inbox" tone="secondary" />
            <StatCard label="Upcoming" value={String(data?.stats.upcoming ?? 0)} icon="trending-up" tone="info" />
            {user?.role === "owner" && (
              <>
                <StatCard
                  label="Revenue (mo)"
                  value={`₹${Math.round(data?.stats.revenue_month ?? 0).toLocaleString("en-IN")}`}
                  icon="dollar-sign"
                  tone="success"
                />
                <StatCard
                  label="Pending"
                  value={`₹${Math.round(data?.stats.pending_amount ?? 0).toLocaleString("en-IN")}`}
                  icon="alert-circle"
                  tone="warning"
                />
                <StatCard
                  label="Profit (mo)"
                  value={`₹${Math.round(data?.stats.profit_month ?? 0).toLocaleString("en-IN")}`}
                  icon="trending-up"
                  tone="brand"
                />
              </>
            )}
          </ScrollView>

          <SectionHeader title="Today's events" />
          {data?.today_events?.length ? (
            <View style={styles.list}>
              {data.today_events.map((b) => <EventCard key={b.id} b={b} />)}
            </View>
          ) : (
            <EmptyBlock text="No events today." />
          )}

          <SectionHeader title="Upcoming" />
          {data?.upcoming?.length ? (
            <View style={styles.list}>
              {data.upcoming.map((b) => <EventCard key={b.id} b={b} />)}
            </View>
          ) : (
            <EmptyBlock text="No upcoming bookings." />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: any; tone: "brand" | "secondary" | "success" | "warning" | "info" }) {
  const palette = {
    brand: { bg: colors.brandPrimary, fg: colors.onBrandPrimary },
    secondary: { bg: colors.brandSecondary, fg: colors.onBrandSecondary },
    success: { bg: colors.success, fg: colors.onSuccess },
    warning: { bg: colors.brandTertiary, fg: colors.onBrandTertiary },
    info: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
  }[tone];
  return (
    <View style={[styles.stat, { backgroundColor: palette.bg }]} testID={`stat-${label}`}>
      <FeatherIcon name={icon} size={18} color={palette.fg} />
      <Text style={[styles.statValue, { color: palette.fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.fg, opacity: 0.85 }]}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function EventCard({ b }: { b: any }) {
  const start = new Date(b.start_at);
  const timeLabel = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateLabel = start.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" });
  const statusColor = b.status === "confirmed" ? colors.success : b.status === "blocked" ? colors.error : colors.brandSecondary;
  return (
    <Link href={{ pathname: "/booking/[id]", params: { id: b.id } }} asChild>
      <Pressable testID={`event-card-${b.id}`} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardDate}>{dateLabel}</Text>
          <Text style={styles.cardTime}>{timeLabel}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{b.customer?.name ?? "Customer"}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {b.event_type}{b.venue ? ` • ${b.venue}` : ""}
          </Text>
          <View style={styles.cardBadges}>
            <View style={[styles.chip, { backgroundColor: statusColor }]}>
              <Text style={styles.chipText}>{b.status}</Text>
            </View>
            {b.guests ? (
              <View style={[styles.chip, { backgroundColor: colors.surfaceTertiary }]}>
                <Text style={[styles.chipText, { color: colors.onSurfaceTertiary }]}>{b.guests} guests</Text>
              </View>
            ) : null}
          </View>
        </View>
        <FeatherIcon name="chevron-right" size={18} color={colors.muted} />
      </Pressable>
    </Link>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <FeatherIcon name="moon" size={22} color={colors.muted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statsRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  stat: {
    width: 140,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    flexShrink: 0,
  },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.onSurface,
    fontFamily: Platform.select({ ios: typography.display, default: undefined }),
  },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLeft: {
    width: 60,
    paddingRight: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  cardDate: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  cardTime: { fontSize: 15, fontWeight: "700", color: colors.brandPrimary, marginTop: 2 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  cardMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cardBadges: { flexDirection: "row", gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  chipText: { color: colors.onBrandPrimary, fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  empty: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  emptyText: { color: colors.onSurfaceTertiary, fontSize: 13 },
  retry: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.brandPrimary },
  retryText: { color: colors.onBrandPrimary, fontWeight: "700" },
});
