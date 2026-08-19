/**
 * @layam/design-system — Canonical Obsidian Design Tokens
 * Single source of truth for Layam's audiophile instrument design language.
 */

export const TOKENS = {
  colors: {
    // Surfaces
    bgObsidian: "#090a0c",
    surfaceSunken: "#060708",
    surfaceCharcoal: "#111216",
    surfaceRaised: "#16181e",
    surfaceActive: "#1e2027",

    // Accents
    accentAmber: "#e59e38",
    accentAmberHover: "#f0ab4d",
    accentAmberDim: "rgba(229, 158, 56, 0.15)",
    accentGold: "#D99A2B",

    // Text
    textPrimary: "#f2f3f5",
    textSecondary: "#9ba1ad",
    textTertiary: "#6b7280",

    // Borders
    borderSubtle: "rgba(255, 255, 255, 0.07)",
    borderMedium: "rgba(255, 255, 255, 0.12)",
    borderAmber: "rgba(229, 158, 56, 0.35)",

    // Semantic States
    stateSuccess: "#5FAE7D",
    stateWarning: "#D9A441",
    stateError: "#C6604F",
    stateInfo: "#6B8CAE",
  },
  typography: {
    fontUi: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    fontTech: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
    techClass: "font-mono tabular-nums tracking-wider uppercase",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    full: "9999px",
  },
  elevation: {
    floating: "0 8px 24px rgba(0, 0, 0, 0.4)",
    none: "none",
  },
  motion: {
    micro: "120ms ease-out",
    panel: "240ms ease-in-out",
    spring: {
      stiffness: 300,
      damping: 30,
    },
  },
} as const;

export type DesignTokens = typeof TOKENS;
export default TOKENS;
