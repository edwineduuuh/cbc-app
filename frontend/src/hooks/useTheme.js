"use client";

import { useTheme as useThemeContext } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

/**
 * Hook that pages should use to ensure they re-render when theme changes
 * Returns theme info and a render trigger
 */
export function useTheme() {
  const { theme, isDark } = useThemeContext();
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    console.log(
      "[useTheme Hook] Theme changed to:",
      theme,
      "isDark:",
      isDark,
      "Re-render count:",
      renderCount + 1,
    );
    // Force page re-render when theme changes
    setRenderCount((prev) => prev + 1);
  }, [theme, isDark]);

  return { theme, isDark };
}

export default useTheme;
