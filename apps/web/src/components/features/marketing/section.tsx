import type { ReactElement, ReactNode } from "react";
import { Container } from "@mui/material";

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
}

/** Shared vertical rhythm for the landing sections. */
export function Section(props: SectionProps): ReactElement {
  const { children, maxWidth = "lg", id, tightTop } = props;
  return (
    <Container
      id={id}
      maxWidth={maxWidth}
      sx={{
        paddingTop: tightTop ? { xs: 3, md: 4 } : { xs: 7, md: 10 },
        paddingBottom: { xs: 7, md: 10 },
      }}
    >
      {children}
    </Container>
  );
}
