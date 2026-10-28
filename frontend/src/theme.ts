// Design tokens for Mauli Events. Light theme only.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FDFBF7",
  onSurface: "#2B1D19",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#2B1D19",
  surfaceTertiary: "#F5EBE1",
  onSurfaceTertiary: "#4A362E",
  surfaceInverse: "#2B1D19",
  onSurfaceInverse: "#FDFBF7",
  muted: "#8C7D76",

  brand: "#7A2A22",
  onBrand: "#FFFFFF",
  brandPrimary: "#7A2A22",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#D89B27",
  onBrandSecondary: "#2B1D19",
  brandTertiary: "#F3DCA8",
  onBrandTertiary: "#5C3E08",

  success: "#3E6641",
  onSuccess: "#FFFFFF",
  warning: "#D89B27",
  onWarning: "#2B1D19",
  error: "#B33939",
  onError: "#FFFFFF",
  info: "#665345",
  onInfo: "#FFFFFF",

  border: "#EBE1D7",
  borderStrong: "#D6C3B3",
  divider: "#EBE1D7",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 } as const;
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;
export const typography = {
  display: "Playfair Display",
  text: "Plus Jakarta Sans",
} as const;

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = (system === "light" || system === "dark") && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export const colors = light;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
