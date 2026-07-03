import type { ReactElement, ReactNode } from "react";
import { Container } from "@mui/material";

interface SectionProps {
  children: ReactNode;
  /** Container width; prose-heavy sections (FAQ) use "md". */
  maxWidth?: "md" | "lg";
  id?: string;
}

/** Shared vertical rhythm for the landing sections. */
export function Section(props: SectionProps): ReactElement {
  const { children, maxWidth = "lg", id } = props;
  return (
    <Container id={id} maxWidth={maxWidth} sx={{ paddingBlock: { xs: 7, md: 10 } }}>
      {children}
    </Container>
  );
}
