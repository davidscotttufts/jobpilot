import type { ReactElement } from "react";
import { Container, Stack } from "@mui/material";
import { ResumesContent } from "@/components/features/resumes";
import { PageHeader } from "@/components/ui/layout/page-header";

export default function ResumesPage(): ReactElement {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Settings"
          title="Resumes"
          description="Upload PDFs that skills attach during applications. The default is used unless a board overrides it."
        />
        <ResumesContent />
      </Stack>
    </Container>
  );
}
