import FeatherIcon from "@react-native-vector-icons/feather";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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

export default function NewCustomer() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", mobile: "", address: "", email: "", referral_source: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setError(null);
    if (!form.name || !form.mobile) {
      setError("Name and mobile are required");
      return;
    }
    setSaving(true);
    try {
      await api("/api/customers", { method: "POST", body: JSON.stringify(form) });
      qc.invalidateQueries({ queryKey: ["customers"] });
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
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <FeatherIcon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Customer</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
          <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testID="customer-name" />
          <Field label="Mobile *" value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} keyboardType="phone-pad" testID="customer-mobile" />
          <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} multiline />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} keyboardType="email-address" />
          <Field label="Referral source" value={form.referral_source} onChange={(v) => setForm({ ...form, referral_source: v })} />
          <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} multiline />
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable testID="customer-save" onPress={onSave} style={styles.saveBtn} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.saveText}>Save customer</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export function Field({ label, value, onChange, multiline, keyboardType, testID }: any) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        multiline={!!multiline}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && { height: 80, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.surface },
  title: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  label: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  err: { color: colors.error, marginTop: spacing.sm },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  saveBtn: { backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  saveText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
});
