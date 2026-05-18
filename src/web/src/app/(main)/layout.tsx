import type { PropsWithChildren, ReactElement } from "react";
import { Box } from "@mui/material";
import { AppShell } from "@/components/layout";
import { AutopilotStopPill } from "@/components/features/runs/autopilot-stop-pill";

export default function MainLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <AppShell>
      <Box sx={{ py: 3 }}>{children}</Box>
      <AutopilotStopPill />
    </AppShell>
  );
}
