import type { ReactElement } from "react";
import { Box } from "@mui/material";

interface SectionGlowProps {
  /** Wash color, already alpha'd - tone-matched to the content it sits behind. */
  color: string;
  /** How far the wash bleeds past its container on desktop. */
  spread?: number;
}

/** Quiet radial wash behind a framed panel. Needs a `position: relative` parent. */
export function SectionGlow(props: SectionGlowProps): ReactElement {
  const { color, spread = 48 } = props;
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        // Zero horizontal bleed on mobile - it widens the page and causes sideways scroll.
        inset: { xs: "-48px 0", md: -spread },
        background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${color}, transparent 70%)`,
        pointerEvents: "none",
      }}
    />
  );
}
