"use client";

import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import { AttentionStrip } from "./dashboard/attention-strip";
import { CampaignGroups } from "./dashboard/campaign-groups";
import { NowRunning } from "./dashboard/now-running";
import { PilotStatusCard } from "./dashboard/pilot-card";
import { ProfileChecklistCard } from "./dashboard/profile-checklist-card";
import { StatTiles } from "./dashboard/stat-tiles";

/** Overview tab - totals first, then what needs me, what's live, and the campaign history. */
export function OverviewPanel(): ReactElement {
  return (
    <Stack spacing={2}>
      <StatTiles />
      <ProfileChecklistCard />
      <AttentionStrip />
      <PilotStatusCard />
      <NowRunning />
      <CampaignGroups />
    </Stack>
  );
}
