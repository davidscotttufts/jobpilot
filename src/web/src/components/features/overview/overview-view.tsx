"use client";

import type { ReactElement } from "react";
import { Grid, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/api/hooks";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/query-keys";
import type { OverviewStatsDto, OverviewTopBoardEntry } from "@/api/types";
import { ApplicationsTimelineChart } from "./applications-timeline-chart";
import { OverviewStatTiles } from "./overview-stat-tiles";
import { StageBreakdownChart } from "./stage-breakdown-chart";
import { TopBoardsList } from "./top-boards-list";

function boardsToEntries(boards: OverviewTopBoardEntry[]): { label: string; count: number }[] {
  return boards.map((b) => ({ label: b.board, count: b.count }));
}

export function OverviewView(): ReactElement {
  const query = useApiQuery<OverviewStatsDto>(
    queryKeys.overview.stats(),
    () => apiClient.get<OverviewStatsDto>("/api/overview"),
    { errorMessage: "Failed to load overview stats" },
  );

  if (query.isPending) {
    return <Typography variant="body2Muted">Loading overview</Typography>;
  }

  if (!query.data) {
    return <Typography variant="body2Muted">No data available.</Typography>;
  }

  const stats = query.data;
  const rejectReasonEntries = stats.topRejectReasons.map((r) => ({
    label: r.reason,
    count: r.count,
  }));

  return (
    <Stack spacing={3}>
      <OverviewStatTiles stats={stats} />

      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ApplicationsTimelineChart data={stats.perDay} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StageBreakdownChart data={stats.stageBreakdown} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TopBoardsList
            eyebrow="Distribution"
            title="Top boards"
            entries={boardsToEntries(stats.topBoards)}
            emptyMessage="No applications have been linked to a job board yet."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TopBoardsList
            eyebrow="Diagnostics"
            title="Top failure reasons"
            entries={rejectReasonEntries}
            emptyMessage="No failed campaign jobs recorded."
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
