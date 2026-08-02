import type { CSSProperties } from "react";
import type { accent, line, stages, surfaces } from "./palette";
import type { controlHeights, gradients, iconSizes, motion, radii, shadows } from "./tokens";

/** Single list of custom variants; the three MUI interfaces below all derive from it. */
interface CustomTypographyVariants {
  body1Muted: CSSProperties;
  body2Muted: CSSProperties;
  captionMuted: CSSProperties;
  overline: CSSProperties;
  overlineMuted: CSSProperties;
  monoChip: CSSProperties;
  statValue: CSSProperties;
  statLabel: CSSProperties;
  body1Strong: CSSProperties;
  body2Strong: CSSProperties;
  displayLg: CSSProperties;
  displayMd: CSSProperties;
  docsBody: CSSProperties;
  docsH1: CSSProperties;
  docsH2: CSSProperties;
  docsH3: CSSProperties;
  docsH4: CSSProperties;
}

declare module "@mui/material/styles" {
  interface Palette {
    surfaces: typeof surfaces;
    accent: typeof accent;
    line: typeof line;
    stages: typeof stages;
  }
  interface PaletteOptions {
    surfaces?: typeof surfaces;
    accent?: typeof accent;
    line?: typeof line;
    stages?: typeof stages;
  }

  interface Theme {
    gradients: typeof gradients;
    motion: typeof motion;
    radii: typeof radii;
    shadows_custom: typeof shadows;
    iconSizes: typeof iconSizes;
    controlHeights: typeof controlHeights;
  }
  interface ThemeOptions {
    gradients?: typeof gradients;
    motion?: typeof motion;
    radii?: typeof radii;
    shadows_custom?: typeof shadows;
    iconSizes?: typeof iconSizes;
    controlHeights?: typeof controlHeights;
  }

  interface TypographyVariants extends CustomTypographyVariants {}
  interface TypographyVariantsOptions extends Partial<CustomTypographyVariants> {}

  interface TypeText {
    prose: string;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides extends Record<keyof CustomTypographyVariants, true> {}
}

declare module "@mui/material/SvgIcon" {
  interface SvgIconPropsSizeOverrides {
    xs: true;
    sm: true;
    md: true;
    lg: true;
    xl: true;
    xxl: true;
    "2xxl": true;
  }
}

declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    interactive: true;
    live: true;
    /** Hover-lift + accent glow, for a whole card that is a link. */
    lift: true;
    /** Flame-accent border, for inline CTA cards. */
    accent: true;
    /** Bordered, radius-md surface for inline panels and framed blocks. */
    panel: true;
    /** Raised radius-lg frame for the landing page's showcase surfaces. */
    showcase: true;
  }
}
