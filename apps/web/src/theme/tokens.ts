import { alpha } from "@mui/material/styles";
import { accent, feedback } from "./palette";

// Lighter flame tints used only inside these gradients - no equivalent in palette.ts.
const flameLight = "#FF8A5C";
const flameMid = "#FF7A4D";

export const gradients = {
  primary: `linear-gradient(135deg, ${flameLight}, ${accent.primary})`,
  reversed: `linear-gradient(135deg, ${flameMid}, ${accent.dark})`,
  orb: `conic-gradient(from 200deg, ${accent.primary}, ${feedback.warning}, ${accent.secondary}, ${accent.primary})`,
} as const;

/** Soft radial light behind marketing surfaces, keyed by where it is anchored. */
export const glows = {
  top: `radial-gradient(ellipse 80% 60% at 50% -10%, ${alpha(accent.primary, 0.09)}, transparent 60%)`,
  corner: `radial-gradient(ellipse 45% 90% at 10% -15%, ${alpha(accent.primary, 0.2)}, transparent 50%)`,
  center: `radial-gradient(ellipse 60% 60% at 50% 50%, ${alpha(accent.primary, 0.08)}, transparent 70%)`,
} as const;

export const tints = {
  selected: alpha(accent.primary, 0.16),
  selectedHover: alpha(accent.primary, 0.24),
} as const;

export const motion = {
  fast: "160ms cubic-bezier(0.3,0.7,0.2,1)",
  standard: "240ms cubic-bezier(0.2,0.8,0.2,1)",
  expressive: "320ms cubic-bezier(0.2,0.8,0.2,1)",
} as const;

export const shadows = {
  sm: "none",
  // Top-edge highlight so panels read as lit surfaces, not flat rectangles.
  highlight: "inset 0 1px 0 rgba(255,255,255,0.04)",
  md: "0 4px 14px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.04)",
  lg: "0 18px 36px -10px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.05)",
  focus: `0 0 0 2px ${alpha(accent.primary, 0.5)}`,
} as const;

export const radii = {
  xs: 2,
  sm: 3,
  md: 6,
  lg: 10,
  pill: 999,
} as const;

/**
 * The two heights every input, button and toggle snaps to, so a filter row lines up without
 * per-call-site `sx`. `md` is what MUI's `size="small"` outlined input already measures at our
 * 13px body font - the rest are pinned to it.
 */
export const controlHeights = {
  sm: 32,
  md: 38,
} as const;

export const iconSizes = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
  "2xxl": 32,
} as const;

export type IconSizeToken = keyof typeof iconSizes;
