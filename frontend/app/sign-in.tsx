import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
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

import { useAuth } from "@/src/auth-context";
import { colors, radius, spacing, typography } from "@/src/theme";

const BG = "https://images.unsplash.com/photo-1705475388142-a2700c4caeb5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwyfHxtYXJpZ29sZCUyMGZsb3dlciUyMGRlY29yYXRpb24lMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc5MjQ5Mzk3MHww&ixlib=rb-4.1.0&q=85";

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!username || !password) {
      setError("Enter username and password");
      return;
    }
    setLoading(true);
    try {
      await signIn(username.trim(), password);
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="sign-in-screen">
      <Image source={{ uri: BG }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={["rgba(43,29,25,0.1)", "rgba(43,29,25,0.75)", "#2B1D19"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing["3xl"], paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroWrap}>
            <Text style={styles.eyebrow}>STAFF PORTAL</Text>
            <Text style={styles.title}>Mauli Events</Text>
            <Text style={styles.subtitle}>Internal booking, catering & decoration management.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in</Text>
            <Text style={styles.label}>Username</Text>
            <TextInput
              testID="sign-in-username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="owner"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="sign-in-password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              style={styles.input}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
            {error ? (
              <Text style={styles.error} testID="sign-in-error">{error}</Text>
            ) : null}
            <Pressable
              testID="sign-in-submit"
              onPress={onSubmit}
              disabled={loading}
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            >
              {loading ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <Text style={styles.btnText}>Sign in</Text>
              )}
            </Pressable>
            <Text style={styles.hint}>Private app — only authorized staff.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceInverse },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, flexGrow: 1, justifyContent: "space-between" },
  heroWrap: { marginTop: spacing["2xl"] },
  eyebrow: { color: colors.brandSecondary, fontSize: 12, letterSpacing: 3, fontWeight: "600" },
  title: {
    color: colors.onSurfaceInverse,
    fontSize: 44,
    fontFamily: Platform.select({ ios: typography.display, default: undefined }),
    marginTop: spacing.sm,
    fontWeight: "500",
  },
  subtitle: { color: "#E6D9CF", fontSize: 15, marginTop: spacing.sm, lineHeight: 22 },
  card: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing["2xl"],
  },
  cardTitle: { fontSize: 20, color: colors.onSurface, fontWeight: "600", marginBottom: spacing.lg },
  label: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600", marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.error, marginTop: spacing.md, fontSize: 13 },
  btn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  btnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "600", letterSpacing: 0.3 },
  hint: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
