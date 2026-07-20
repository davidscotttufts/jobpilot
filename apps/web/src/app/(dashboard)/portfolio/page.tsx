import type { ReactElement } from "react";
import { Container } from "@mui/material";
import { PortfolioSettings } from "@/components/features/portfolio";
import { PageHeader } from "@/components/ui/layout";

export default function PortfolioPage(): ReactElement {
  return (
    <Container maxWidth="md" sx={{ gap: 2 }}>
      <PageHeader
        eyebrow="Share"
        title="Portfolio"
        description="Your public hire-me page, built from your active resume and job-search activity."
      />
      <PortfolioSettings />
    </Container>
  );
}
