import type { ReactElement, ReactNode } from "react";
import { Typography } from "@mui/material";
import { fontFamilies } from "@/theme";

interface SectionEyebrowProps {
  children: ReactNode;
  /** Palette token; accent for tour rows, muted for section headers. */
  color?: "accent.primary" | "text.secondary";
}

/** Mono kicker label above section headings. */
export function SectionEyebrow(props: SectionEyebrowProps): ReactElement {
  const { children, color = "text.secondary" } = props;
  return (
    <Typography
      sx={{ fontFamily: fontFamilies.mono, fontSize: "0.75rem", letterSpacing: "0.18em", color }}
    >
      {children}
    </Typography>
  );
}
