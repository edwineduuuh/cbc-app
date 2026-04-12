"use client";

/**
 * Simple wrapper that just renders children
 * Pages will handle theme re-renders via useTheme hook
 */
export function ThemeWrapper({ children }) {
  return <>{children}</>;
}

export default ThemeWrapper;
