import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import { OverviewView } from "@/components/features/overview";
import { PageHeader } from "@/components/ui/layout";

export default function OverviewPage(): ReactElement {
  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description="Roll-up stats across your applications, runs, and pipeline."
      />
      <OverviewView />
    </Stack>
  );
}
