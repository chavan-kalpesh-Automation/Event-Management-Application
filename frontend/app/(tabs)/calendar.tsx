import FeatherIcon from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/auth";
import { ScreenHeader } from "@/src/components/screen-header";
import { colors, radius, spacing, typography } from "@/src/theme";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  const { data: bookings, isLoading, isError, error, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ["bookings", monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: () =>
      api<any[]>(`/api/bookings?start=${encodeURIComponent(monthStart.toISOString())}&end=${encodeURIComponent(monthEnd.toISOString())}`),
  });

  const byDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    (bookings ?? []).forEach((b) => {
      const key = new Date(b.start_at).toDateString();
      map[key] = map[key] || [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  const grid: (Date | null)[] = useMemo(() => {
    const cells: (Date | null)[] = [];
    const firstDay = monthStart.getDay();
    for (let i = 0; i < firstDay; i++) cells.push(null);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor, monthStart]);

  const selectedBookings = byDay[selected.toDateString()] ?? [];

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.md }}>
        <ScreenHeader
          eyebrow="SCHEDULE"
          title="Calendar"
          right={
            <Link href="/booking/new" asChild>
              <Pressable testID="calendar-add-booking" style={styles.addBtn}>
                <FeatherIcon name="plus" size={18} color={colors.onBrandPrimary} />
              </Pressable>
            </Link>
          }
        />
      </View>

      <View style={styles.monthRow}>
        <Pressable
          testID="calendar-prev-month"
          onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          style={styles.navBtn}
        >
          <FeatherIcon name="chevron-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.monthLabel}>{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</Text>
        <Pressable
          testID="calendar-next-month"
          onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          style={styles.navBtn}
        >
          <FeatherIcon name="chevron-right" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {DAY_NAMES.map((d, i) => (
          <Text key={i} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{(error as Error)?.message ?? "Could not load bookings."}</Text>
          <Pressable onPress={() => refetch()} disabled={isRefetching} style={styles.retry}><Text style={styles.retryText}>{isRefetching ? "Retrying…" : "Try again"}</Text></Pressable>
        </View>
      ) : (
        <View style={styles.grid}>
          {grid.map((date, idx) => {
            if (!date) return <View key={idx} style={styles.cell} />;
            const isSelected = sameDay(date, selected);
            const isToday = sameDay(date, new Date());
            const list = byDay[date.toDateString()] ?? [];
            const confirmed = list.some((b) => b.status === "confirmed" || b.status === "blocked");
            const tentative = list.some((b) => b.status === "tentative");
            return (
              <Pressable
                key={idx}
                testID={`day-${date.getDate()}`}
                onPress={() => setSelected(date)}
                style={[styles.cell, isSelected && styles.cellSelected]}
              >
                <Text style={[styles.cellText, isToday && styles.cellToday, isSelected && styles.cellTextSelected]}>
                  {date.getDate()}
                </Text>
                <View style={styles.dots}>
                  {confirmed ? <View style={[styles.dot, { backgroundColor: isSelected ? colors.onBrandPrimary : colors.brandPrimary }]} /> : null}
                  {tentative ? <View style={[styles.dot, { backgroundColor: isSelected ? colors.onBrandPrimary : colors.brandSecondary }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.listWrap}>
        <Text style={styles.listHeader}>
          {selected.toLocaleDateString([], { weekday: "long", day: "2-digit", month: "long" })}
        </Text>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing["2xl"] }}>
          {selectedBookings.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No bookings. Tap + to add one.</Text>
            </View>
          ) : (
            selectedBookings.map((b) => (
              <Pressable
                key={b.id}
                testID={`day-event-${b.id}`}
                onPress={() => router.push({ pathname: "/booking/[id]", params: { id: b.id } })}
                style={styles.evt}
              >
                <View style={[styles.evtStripe, { backgroundColor: statusColor(b.status) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.evtTime}>
                    {new Date(b.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} • {b.event_type}
                  </Text>
                  <Text style={styles.evtName}>{b.customer?.name ?? "Customer"}</Text>
                  {b.venue ? <Text style={styles.evtMeta}>{b.venue}</Text> : null}
                </View>
                <View style={[styles.statusChip, { backgroundColor: statusColor(b.status) }]}>
                  <Text style={styles.statusChipText}>{b.status}</Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function statusColor(s: string) {
  if (s === "confirmed") return colors.success;
  if (s === "blocked") return colors.error;
  if (s === "cancelled") return colors.muted;
  return colors.brandSecondary;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  addBtn: {
    backgroundColor: colors.brandPrimary,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.onSurface,
    fontFamily: Platform.select({ ios: typography.display, default: undefined }),
  },
  navBtn: { padding: spacing.sm },
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  weekDay: { flex: 1, textAlign: "center", color: colors.muted, fontSize: 11, fontWeight: "700" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cellSelected: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
  },
  cellText: { color: colors.onSurface, fontSize: 14, fontWeight: "500" },
  cellToday: { color: colors.brandPrimary, fontWeight: "700" },
  cellTextSelected: { color: colors.onBrandPrimary, fontWeight: "700" },
  dots: { flexDirection: "row", gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 999 },
  listWrap: {
    flex: 1,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.md,
  },
  listHeader: {
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 13 },
  retry: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.brandPrimary },
  retryText: { color: colors.onBrandPrimary, fontWeight: "700" },
  evt: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  evtStripe: { width: 4, height: 36, borderRadius: 2 },
  evtTime: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  evtName: { fontSize: 15, fontWeight: "600", color: colors.onSurface, marginTop: 2 },
  evtMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  statusChipText: { color: colors.onBrandPrimary, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
});
