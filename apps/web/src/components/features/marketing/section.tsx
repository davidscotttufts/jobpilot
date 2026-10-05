import type { ReactElement, ReactNode } from "react";
import { Box, Container } from "@mui/material";
import type { glows } from "@/theme";
import { Glow } from "./glow";
import { MARKETING_NAV_HEIGHT } from "./marketing-link-sx";

interface SectionProps {
  children: ReactNode;
  /** Container width; prose-heavy sections (FAQ) use "md". */
  maxWidth?: "md" | "lg";
  id?: string;
  /**
   * Trim the top padding so this section reads as one thought with the one above it,
   * instead of sitting a full rhythm apart. Only the lower section owns the pairing.
   */
  tightTop?: boolean;
  /** Card-colored full-width band with hairline edges, to set a section apart from its neighbors. */
  band?: boolean;
  glow?: keyof typeof glows;
}

/** Shared vertical rhythm for the landing sections. */
export function Section(props: SectionProps): ReactElement {
  const { children, maxWidth = "lg", id, tightTop = false, band = false, glow } = props;

  return (
    <Box
      component="section"
      id={id}
      sx={[
        { position: "relative", overflow: "hidden", scrollMarginTop: MARKETING_NAV_HEIGHT },
        band && { borderBlock: 1, borderColor: "line.divider", backgroundColor: "surfaces.card" },
      ]}
    >
      {glow && <Glow placement={glow} />}
      <Container
        maxWidth={maxWidth}
        sx={{
          position: "relative",
          paddingTop: tightTop ? { xs: 3, md: 4 } : { xs: 7, md: 10 },
          paddingBottom: { xs: 7, md: 10 },
        }}
      >
        {children}
      </Container>
    </Box>
  );
}
