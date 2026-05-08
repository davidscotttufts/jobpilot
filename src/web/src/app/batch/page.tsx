import type { ReactElement } from "react";
import { Container, Stack } from "@mui/material";
import { BatchAddUrlsButton, BatchContent } from "@/components/features/batch";
import { PageHeader } from "@/components/ui/layout";

export default function BatchPage(): ReactElement {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <PageHeader
          eyebrow="Queue"
          title="Batch queue"
          description="Job URLs the apply-batch skill will visit, score, and apply to. Add as many as you like; the skill drains them on its next run."
          actions={<BatchAddUrlsButton />}
        />
        <BatchContent />
      </Stack>
    </Container>
  );
}
