import FeatherIcon from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/auth";
import { ScreenHeader } from "@/src/components/screen-header";
import { colors, radius, spacing } from "@/src/theme";

export default function Customers() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [q, setQ] = useState("");

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ["customers", q],
    queryFn: () => api<any[]>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.md }}>
        <ScreenHeader
          eyebrow="CONTACTS"
          title="Customers"
          right={
            <Link href="/customer/new" asChild>
              <Pressable testID="customers-add" style={styles.add}>
                <FeatherIcon name="plus" size={18} color={colors.onBrandPrimary} />
              </Pressable>
            </Link>
          }
        />
      </View>
      <View style={styles.searchWrap}>
        <FeatherIcon name="search" size={16} color={colors.muted} />
        <TextInput
          testID="customers-search"
          value={q}
          onChangeText={setQ}
          placeholder="Search by name or mobile"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? "Could not load customers."}</Text>
          <Pressable onPress={() => refetch()} disabled={isRefetching} style={styles.retry}><Text style={styles.retryText}>{isRefetching ? "Retrying…" : "Try again"}</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing["2xl"] }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No customers yet.</Text></View>}
          renderItem={({ item }) => (
            <Pressable
              testID={`customer-${item.id}`}
              onPress={() => router.push({ pathname: "/customer/[id]", params: { id: item.id } })}
              style={styles.row}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.name?.[0] ?? "?").toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.mobile}{item.address ? ` • ${item.address}` : ""}</Text>
              </View>
              <FeatherIcon name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  add: {
    backgroundColor: colors.brandPrimary,
    width: 40, height: 40, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.onSurface, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.onBrandTertiary, fontSize: 16, fontWeight: "700" },
  name: { fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { padding: spacing["2xl"], alignItems: "center" },
  emptyText: { color: colors.muted },
  errorText: { color: colors.error, textAlign: "center" },
  retry: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.brandPrimary },
  retryText: { color: colors.onBrandPrimary, fontWeight: "700" },
});
