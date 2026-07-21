import { fontFamilies, line, radii } from "@/theme";

/**
 * The outlined mono pill shared by the landing sections. Callers set `fontSize` - the ring
 * labels run smaller than the board chips so they fit inside the circle.
 *
 * A plain object, not a `SxProps` typed as a `(theme) => …` callback: the marketing sections
 * are server components and functions cannot cross the RSC boundary.
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
