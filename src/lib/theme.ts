import { useState, useEffect } from "react";

export type ThemeMode = "dark" | "light" | "system";

const THEME_STORAGE_KEY = "layam_theme_mode_v1";

export function getSavedTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved;
    }
  } catch {}
  return "dark";
}

export function applyTheme(mode: ThemeMode) {
  let resolved: "dark" | "light" = "dark";
  if (mode === "system") {
    const isSystemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    resolved = isSystemDark ? "dark" : "light";
  } else {
    resolved = mode;
  }

  const root = document.documentElement;
  if (resolved === "light") {
    root.setAttribute("data-theme", "light");
    root.classList.add("theme-light");
    root.classList.remove("theme-dark");
  } else {
    root.setAttribute("data-theme", "dark");
    root.classList.add("theme-dark");
    root.classList.remove("theme-light");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getSavedTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
    return undefined;
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    applyTheme(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {}
  };

  return { theme, setTheme };
}
