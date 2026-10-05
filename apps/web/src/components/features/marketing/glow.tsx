import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { glows } from "@/theme";

interface GlowProps {
  placement: keyof typeof glows;
  /** How far the light bleeds past its container on desktop. */
  bleed?: number;
}

/** Decorative radial light. Needs a `position: relative` parent. */
export function Glow(props: GlowProps): ReactElement {
  const { placement, bleed = 0 } = props;
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        // No bleed on phones: anything past the edge widens the page into a sideways scroll.
        inset: { xs: 0, md: -bleed },
        background: glows[placement],
        pointerEvents: "none",
      }}
    />
  );
}
