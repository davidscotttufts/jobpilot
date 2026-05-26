import type { ReactElement } from "react";
import { Container } from "@mui/material";
import { RunComposer } from "@/components/features/runs";
import { PageHeader } from "@/components/ui/layout";

export default function NewRunPage(): ReactElement {
  return (
    <Container maxWidth="md" sx={{ gap: 2 }}>
      <PageHeader
        eyebrow="Run"
        title="Start a new run"
        description="Search a job board, score matches, and optionally batch-apply."
      />
      <RunComposer />
    </Container>
  );
}
