import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import { DashboardContent } from "@/components/features/dashboard";
import { PageHeader } from "@/components/ui/layout/page-header";

export default function HomePage(): ReactElement {
  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="JobPilot"
        title="Dashboard"
        description="Snapshot of your job search across every board and skill."
      />
      <DashboardContent />
    </Stack>
  );
}
