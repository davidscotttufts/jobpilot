import type { ReactElement, ReactNode } from "react";
import { Container, type SxProps, type Theme } from "@mui/material";

interface SectionProps {
  children: ReactNode;
  /** Container width; prose-heavy sections (FAQ) use "md". */
  maxWidth?: "md" | "lg";
  id?: string;
  /** Override the default rhythm - e.g. a lighter `paddingTop` to hug the section above. */
  sx?: SxProps<Theme>;
}

/** Shared vertical rhythm for the landing sections. */
export function Section(props: SectionProps): ReactElement {
  const { children, maxWidth = "lg", id, sx } = props;
  return (
    <Container
      id={id}
      maxWidth={maxWidth}
      sx={[{ paddingBlock: { xs: 7, md: 10 } }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </Container>
  );
}
