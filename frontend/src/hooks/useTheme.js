"use client";

import { useTheme as useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { theme, isDark } = useThemeContext();
  return { theme, isDark };
}

export default useTheme;
