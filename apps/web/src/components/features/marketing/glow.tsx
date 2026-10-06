import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { glows } from "@/theme";

interface GlowProps {
  placement: keyof typeof glows;
  /** How far the light bleeds past its container on desktop. */
  bleed?: number;
}

/** Needs a `position: relative` parent. */
export function Glow(props: GlowProps): ReactElement {
  const { placement, bleed = 0 } = props;
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        // No bleed on phones, or the page scrolls sideways.
        inset: { xs: 0, md: -bleed },
        background: glows[placement],
        pointerEvents: "none",
      }}
    />
  );
}
