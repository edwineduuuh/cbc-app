"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize theme from localStorage
    const saved = localStorage.getItem("theme") || "light";
    setThemeState(saved);
    applyToDOM(saved);
    setMounted(true);
  }, []);

  const setTheme = (newTheme) => {
    try {
      setThemeState(newTheme);
      localStorage.setItem("theme", newTheme);
      applyToDOM(newTheme);
    } catch (e) {
      // silently ignore
    }
  };

  // Determine if dark mode is active
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function applyToDOM(theme) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;

  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  if (resolved === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    root.style.setProperty("--bg", "#030712");
    root.style.setProperty("--bg-card", "rgba(255,255,255,0.04)");
    root.style.setProperty("--bg-secondary", "#111827");
    root.style.setProperty("--text", "#f9fafb");
    root.style.setProperty("--text-muted", "#9ca3af");
    root.style.setProperty("--border", "rgba(255,255,255,0.08)");
    root.style.setProperty("--input-bg", "rgba(255,255,255,0.06)");
    root.style.setProperty("--input-text", "#f9fafb");
    root.style.setProperty("--input-placeholder", "rgba(249,250,251,0.30)");
    document.body.style.backgroundColor = "#030712";
    document.body.style.color = "#f9fafb";
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.setProperty("--bg", "#f9fafb");
    root.style.setProperty("--bg-card", "#ffffff");
    root.style.setProperty("--bg-secondary", "#f3f4f6");
    root.style.setProperty("--text", "#111827");
    root.style.setProperty("--text-muted", "#6b7280");
    root.style.setProperty("--border", "#e5e7eb");
    root.style.setProperty("--input-bg", "#ffffff");
    root.style.setProperty("--input-text", "#111827");
    root.style.setProperty("--input-placeholder", "#9ca3af");
    document.body.style.backgroundColor = "#f9fafb";
    document.body.style.color = "#111827";
  }
}
