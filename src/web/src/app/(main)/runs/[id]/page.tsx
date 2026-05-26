import type { ReactElement } from "react";
import { Container } from "@mui/material";
import { RunDetail } from "@/components/features/runs";
import { PageHeader } from "@/components/ui/layout";

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RunDetailPage(props: RunDetailPageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return (
    <Container maxWidth="lg" sx={{ gap: 2 }}>
      <PageHeader eyebrow="Run" title={id} />
      <RunDetail runId={id} />
    </Container>
  );
}
