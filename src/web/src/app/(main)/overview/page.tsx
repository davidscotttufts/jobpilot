import type { ReactElement } from "react";
import { Container } from "@mui/material";
import { OverviewView } from "@/components/features/overview";
import { PageHeader } from "@/components/ui/layout";

export default function OverviewPage(): ReactElement {
  return (
    <Container maxWidth="xl" sx={{ gap: 2 }}>
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description="Roll-up stats across your applications, campaigns, and pipeline."
      />
      <OverviewView />
    </Container>
  );
}
