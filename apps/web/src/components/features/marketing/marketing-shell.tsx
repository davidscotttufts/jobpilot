import type { ReactElement, ReactNode } from "react";
import { Box, Container } from "@mui/material";
import type { Breakpoint } from "@mui/material/styles";
import { MarketingFooter } from "./marketing-footer";
import { MarketingNav } from "./marketing-nav";

interface MarketingShellProps {
  children: ReactNode;
  /** Container width - matches the page's content (e.g. "lg" for lists, "md" for a single column). */
  maxWidth?: Breakpoint;
}

/** The public marketing shell (nav + centered container + footer) shared by acquisition pages. */
export function MarketingShell(props: MarketingShellProps): ReactElement {
  const { children, maxWidth = "lg" } = props;
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "surfaces.base",
        overflowX: "clip",
      }}
    >
      <MarketingNav />
      <Container
        component="main"
        maxWidth={maxWidth}
        sx={{ flex: 1, paddingBlock: { xs: 4, md: 6 } }}
      >
        {children}
      </Container>
      <MarketingFooter />
    </Box>
  );
}
