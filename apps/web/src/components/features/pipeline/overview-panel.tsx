"use client";

import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import { AttentionStrip } from "./dashboard/attention-strip";
import { CampaignGroups } from "./dashboard/campaign-groups";
import { NowRunning } from "./dashboard/now-running";
import { QueuePanel } from "./dashboard/queue-panel";
import { StatTiles } from "./dashboard/stat-tiles";

/** Overview tab — activity-first: what's running, what needs me, queue, campaigns. */
export function OverviewPanel(): ReactElement {
  return (
    <Stack spacing={2}>
      <NowRunning />
      <AttentionStrip />
      <StatTiles />
      <QueuePanel />
      <CampaignGroups />
    </Stack>
  );
}
