import type { ReactElement } from "react";
import { Container } from "@mui/material";
import { CampaignComposer } from "@/components/features/campaigns";
import { PageHeader } from "@/components/ui/layout";

export default function NewCampaignPage(): ReactElement {
  return (
    <Container maxWidth="md" sx={{ gap: 2 }}>
      <PageHeader
        eyebrow="Campaign"
        title="Start a new campaign"
        description="Search a job board, score matches, and optionally batch-apply."
      />
      <CampaignComposer />
    </Container>
  );
}
