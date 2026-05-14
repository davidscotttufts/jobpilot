import type { ReactElement } from "react";
import { Container, Stack } from "@mui/material";
import { AutopilotRunButton, RunsContent } from "@/components/features/runs";
import { PageHeader } from "@/components/ui/layout/page-header";

export default function RunsPage(): ReactElement {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <PageHeader
          eyebrow="History"
          title="Runs"
          description="Autopilot and apply runs. Click a row for the live viewer."
          actions={<AutopilotRunButton />}
        />
        <RunsContent />
      </Stack>
    </Container>
  );
}
