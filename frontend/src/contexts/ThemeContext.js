"use client";

/**
 * StadiSpace has ONE theme: dark (owner's decision, Nov 2026). The <html>
 * element is rendered with class="dark" by app/layout.js and the palette
 * lives in globals.css. This context stays so existing callers of
 * useTheme() keep working; it always reports dark and cannot be changed.
 */
import { createContext, useContext } from "react";

const VALUE = { theme: "dark", isDark: true, setTheme: () => {} };
const ThemeContext = createContext(VALUE);

export function ThemeProvider({ children }) {
  return <ThemeContext.Provider value={VALUE}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Kept for old imports; the theme is fixed. */
export function applyToDOM() {
  if (typeof window === "undefined") return;
  document.documentElement.classList.add("dark");
  document.documentElement.setAttribute("data-theme", "dark");
}
