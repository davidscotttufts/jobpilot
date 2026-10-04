"use client";

import type { ReactElement } from "react";
import { Grid, Skeleton, Stack } from "@mui/material";
import { useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { useTerminalHealth } from "../../agent-dock/use-terminal-health";
import { NeedsAttention } from "../attention/needs-attention";
import { usePilotControls } from "../use-pilot-controls";
import { OrchestrationPanel } from "./orchestration-panel";
import { RecentActivity } from "./recent-activity";
import { PilotSetupChecklist } from "./setup-checklist";
import { StatusBar } from "./status-bar";
import { TaskListPreview } from "./task-list-preview";
import { TodayPanel } from "./today-panel";

export function OverviewTab(): ReactElement {
  // Owned here so the status bar, checklist and diagram share one host poll.
  const controls = usePilotControls();
  const { health, status } = useTerminalHealth(controls.isLoading);
  const stateQuery = useApiQuery(pilotQueries.state(), {
    errorMessage: "Failed to load pilot state",
  });

  const state = stateQuery.data;
  if (stateQuery.isLoading || !state) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={220} />
        <Skeleton variant="rounded" height={180} />
      </Stack>
    );
  }

  const pilot = status?.pilot ?? null;

  return (
    <Stack spacing={3}>
      <PilotSetupChecklist state={state} health={health} />
      <StatusBar state={state} controls={controls} health={health} pilot={pilot} />
      <NeedsAttention />
      <OrchestrationPanel state={state} health={health} pilot={pilot} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <TodayPanel state={state} />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <TaskListPreview />
        </Grid>
      </Grid>
      <RecentActivity />
    </Stack>
  );
}
