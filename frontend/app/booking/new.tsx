import FeatherIcon from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/auth";
import { colors, radius, spacing } from "@/src/theme";

const EVENT_TYPES = ["Wedding", "Haldi", "Engagement", "Reception", "Mehendi", "Catering", "Blocked"];
const STATUSES: Array<{ v: string; label: string; color: string }> = [
  { v: "tentative", label: "Tentative", color: colors.brandSecondary },
  { v: "confirmed", label: "Confirmed", color: colors.success },
  { v: "cancelled", label: "Cancelled", color: colors.muted },
  { v: "blocked", label: "Blocked", color: colors.error },
];

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function parseLocal(s: string): Date | null {
  // Accept "YYYY-MM-DD HH:MM"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return isNaN(d.getTime()) ? null : d;
}

export default function NewBooking() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const qc = useQueryClient();

  const now = new Date();
  now.setMinutes(0, 0, 0);
  const laterDefault = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const [customerId, setCustomerId] = useState<string | undefined>(params.customerId);
  const [eventType, setEventType] = useState("Wedding");
  const [venue, setVenue] = useState("");
  const [startAt, setStartAt] = useState(toLocalInput(now));
  const [endAt, setEndAt] = useState(toLocalInput(laterDefault));
  const [status, setStatus] = useState("tentative");
  const [guests, setGuests] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: customers } = useQuery<any[]>({
    queryKey: ["customers", search],
    queryFn: () => api<any[]>(`/api/customers${search ? `?q=${encodeURIComponent(search)}` : ""}`),
  });

  const selectedCustomer = useMemo(() => customers?.find((c) => c.id === customerId), [customers, customerId]);

  const onSave = async () => {
    setError(null);
    if (!customerId) return setError("Select a customer");
    const s = parseLocal(startAt);
    const e = parseLocal(endAt);
    if (!s || !e) return setError("Enter valid date/time: YYYY-MM-DD HH:MM");
    if (e <= s) return setError("End time must be after start time");
    setSaving(true);
    try {
      const body = {
        customer_id: customerId,
        event_type: eventType,
        venue,
        start_at: s.toISOString(),
        end_at: e.toISOString(),
        status,
        guests: Number(guests) || 0,
        notes,
        total_amount: Number(amount) || 0,
        assigned_worker_ids: [],
      };
      await api("/api/bookings", { method: "POST", body: JSON.stringify(body) });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back" onPress={() => router.back()} style={styles.iconBtn}>
          <FeatherIcon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Booking</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Customer *</Text>
          {selectedCustomer ? (
            <Pressable onPress={() => setCustomerId(undefined)} style={styles.selectedCust} testID="change-customer">
              <View style={{ flex: 1 }}>
                <Text style={styles.custName}>{selectedCustomer.name}</Text>
                <Text style={styles.custMeta}>{selectedCustomer.mobile}</Text>
              </View>
              <FeatherIcon name="x" size={18} color={colors.muted} />
            </Pressable>
          ) : (
            <>
              <TextInput
                testID="booking-search-customer"
                placeholder="Search customer by name or mobile"
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
                style={styles.input}
              />
              <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                {(customers ?? []).slice(0, 5).map((c) => (
                  <Pressable key={c.id} testID={`pick-cust-${c.id}`} onPress={() => setCustomerId(c.id)} style={styles.custRow}>
                    <Text style={styles.custName}>{c.name}</Text>
                    <Text style={styles.custMeta}>{c.mobile}</Text>
                  </Pressable>
                ))}
                {customers?.length === 0 ? <Text style={styles.hint}>No matches. Create a customer first.</Text> : null}
              </View>
            </>
          )}

          <Text style={styles.label}>Event type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {EVENT_TYPES.map((t) => (
              <Pressable key={t} testID={`event-type-${t}`} onPress={() => setEventType(t)} style={[styles.chip, eventType === t && styles.chipActive]}>
                <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Venue</Text>
          <TextInput value={venue} onChangeText={setVenue} placeholder="Mandap name / Location" placeholderTextColor={colors.muted} style={styles.input} />

          <Text style={styles.label}>Start (YYYY-MM-DD HH:MM)</Text>
          <TextInput testID="start-at" value={startAt} onChangeText={setStartAt} style={styles.input} autoCapitalize="none" />
          <Text style={styles.label}>End (YYYY-MM-DD HH:MM)</Text>
          <TextInput testID="end-at" value={endAt} onChangeText={setEndAt} style={styles.input} autoCapitalize="none" />

          <Text style={styles.label}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {STATUSES.map((s) => (
              <Pressable key={s.v} testID={`status-${s.v}`} onPress={() => setStatus(s.v)} style={[styles.chip, status === s.v && { backgroundColor: s.color, borderColor: s.color }]}>
                <Text style={[styles.chipText, status === s.v && { color: "#FFF" }]}>{s.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Guests</Text>
          <TextInput value={guests} onChangeText={setGuests} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Total amount (₹)</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline placeholder="Decorations, catering specifics, instructions…" placeholderTextColor={colors.muted} style={[styles.input, { height: 80, textAlignVertical: "top" }]} />
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable testID="booking-save" onPress={onSave} style={styles.saveBtn} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.saveText}>Save booking</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, backgroundColor: colors.surface },
  title: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  label: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: spacing.md },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.onSurface, borderWidth: 1, borderColor: colors.border },
  err: { color: colors.error, marginTop: spacing.md },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  saveBtn: { backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  saveText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
  custRow: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  custName: { color: colors.onSurface, fontWeight: "600" },
  custMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  selectedCust: { flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: colors.brandTertiary, borderRadius: radius.md, gap: spacing.md },
  hint: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.onBrandPrimary },
});
