import type { ReactElement } from "react";
import { Add } from "@mui/icons-material";
import { Container } from "@mui/material";
import { ProposalsList } from "@/components/features/upwork";
import { LinkButton } from "@/components/ui/buttons";
import { PageHeader } from "@/components/ui/layout";

export default function UpworkPage(): ReactElement {
  return (
    <Container maxWidth="lg" sx={{ gap: 2 }}>
      <PageHeader
        eyebrow="Upwork"
        title="Proposals"
        description="Drafted and submitted Upwork proposals, newest first."
        actions={
          <LinkButton variant="contained" startIcon={<Add fontSize="md" />} href="/upwork/new">
            New proposal
          </LinkButton>
        }
      />
      <ProposalsList />
    </Container>
  );
}
