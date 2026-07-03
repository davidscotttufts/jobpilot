import type { ReactElement, ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { DocsSidebar } from "@/components/features/docs";
import { MarketingFooter, MarketingNav } from "@/components/features/marketing";

interface DocsLayoutProps {
  children: ReactNode;
}

export default function DocsLayout(props: DocsLayoutProps): ReactElement {
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
      <Container maxWidth="lg" sx={{ flex: 1, paddingBlock: { xs: 3, md: 6 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "200px minmax(0, 720px)" },
            gap: { xs: 3, md: 8 },
            alignItems: "start",
          }}
        >
          <Box sx={{ position: { md: "sticky" }, top: { md: 88 } }}>
            <DocsSidebar />
          </Box>
          <Box component="article" sx={{ minWidth: 0 }}>
            {children}
          </Box>
        </Box>
      </Container>
      <MarketingFooter />
    </Box>
  );
}
