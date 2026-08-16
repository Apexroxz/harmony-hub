/**
 * @layam/design-system — Shared Audiophile UI Primitives, Brand Assets & Tokens
 *
 * Obsidian theme tokens, tactile sliders, waveforms, and hardware dials.
 */

export { BrandLogo, BrandLogo as default } from "./brand/BrandLogo";
export type { BrandLogoProps, LogoVariant, LogoSize } from "./brand/BrandLogo";

export { Waveform } from "./player/Waveform";
export type { WaveformProps } from "./player/Waveform";

export const TOKENS = {
  colors: {
    bgObsidian: "#090a0c",
    surfaceCharcoal: "#111216",
    surfaceRaised: "#16181e",
    surfaceActive: "#1e2027",
    surfaceSunken: "#060708",
    accentAmber: "#e59e38",
    accentGold: "#D99A2B",
    textPrimary: "#f2f3f5",
    textSecondary: "#9ba1ad",
    textTertiary: "#6b7280",
    borderSubtle: "rgba(255, 255, 255, 0.07)",
    borderMedium: "rgba(255, 255, 255, 0.12)",
    borderAmber: "rgba(229, 158, 56, 0.35)",
  },
  typography: {
    fontTech: "font-mono tabular-nums tracking-wider uppercase",
  },
} as const;
