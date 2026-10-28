import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/src/auth-context";
import { colors } from "@/src/theme";

function Navigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const onSignIn = segments[0] === "sign-in";
    if (!session && !onSignIn) router.replace("/sign-in");
    else if (session && onSignIn) router.replace("/(tabs)");
  }, [loading, session, segments, router]);
  if (loading) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.surface }}><ActivityIndicator color={colors.brandPrimary} /></View>;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return <QueryClientProvider client={queryClient}><AuthProvider><Navigation /></AuthProvider></QueryClientProvider>;
}
