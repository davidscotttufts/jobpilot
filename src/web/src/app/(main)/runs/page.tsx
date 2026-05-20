import type { ReactElement } from "react";
import { Add } from "@mui/icons-material";
import { Container } from "@mui/material";
import { RunsList } from "@/components/features/runs/runs-list";
import { LinkButton } from "@/components/ui/buttons";
import { PageHeader } from "@/components/ui/layout";

export default function RunsPage(): ReactElement {
  return (
    <Container maxWidth="lg" sx={{ gap: 2 }}>
      <PageHeader
        eyebrow="History"
        title="Runs"
        description="Search and auto-apply runs, newest first."
        actions={
          <LinkButton variant="contained" startIcon={<Add fontSize="md" />} href="/runs/new">
            New run
          </LinkButton>
        }
      />
      <RunsList />
    </Container>
  );
}
