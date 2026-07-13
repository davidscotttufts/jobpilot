import type { ReactElement, ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { MarketingFooter, MarketingNav } from "@/components/features/marketing";

interface JobsLayoutProps {
  children: ReactNode;
}

/** The public job index shares the marketing shell - it is an acquisition surface, not the app. */
export default function JobsLayout(props: JobsLayoutProps): ReactElement {
  const { children } = props;
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "surfaces.base",
      }}
    >
      <MarketingNav />
      <Container component="main" maxWidth="lg" sx={{ flex: 1, paddingBlock: { xs: 4, md: 6 } }}>
        {children}
      </Container>
      <MarketingFooter />
    </Box>
  );
}
