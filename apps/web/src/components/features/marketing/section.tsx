import type { ReactElement, ReactNode } from "react";
import { Box, Container } from "@mui/material";
import type { glows } from "@/theme";
import { Glow } from "./glow";
import { MARKETING_NAV_HEIGHT } from "./marketing-link-sx";

interface SectionProps {
  children: ReactNode;
  maxWidth?: "md" | "lg";
  id?: string;
  /** Trims top padding so this section pairs with the one above. Set it on the lower one only. */
  tightTop?: boolean;
  /** Full-width card-colored band with hairline edges. */
  band?: boolean;
  glow?: keyof typeof glows;
}

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
