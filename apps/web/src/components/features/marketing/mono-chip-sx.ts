import { fontFamilies, line, radii } from "@/theme";

/**
 * The outlined mono pill shared by the landing sections. Callers set `fontSize` - ring labels
 * run smaller than board chips to fit the circle. A plain object, not a `(theme) => …`
 * callback: these sections are server components and functions can't cross the RSC boundary.
 */
export const monoChipSx = {
  fontFamily: fontFamilies.mono,
  whiteSpace: "nowrap",
  paddingInline: 1.25,
  paddingBlock: 0.5,
  borderRadius: radii.pill,
  color: "text.secondary",
  border: `1px solid ${line.border}`,
  backgroundColor: "surfaces.elevated",
} as const;
