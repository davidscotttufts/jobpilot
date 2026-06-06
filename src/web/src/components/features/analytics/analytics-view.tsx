"use client";

import type { ReactElement } from "react";
import { Grid, Stack, Typography } from "@mui/material";
import { apiClient } from "@/api/client";
import { useApiQuery } from "@/api/hooks";
import { queryKeys } from "@/api/query-keys";
import type { AnalyticsStatsDto, AnalyticsTopBoardEntry } from "@/api/types";
import { AnalyticsStatTiles } from "./analytics-stat-tiles";
import { ApplicationsTimelineChart } from "./applications-timeline-chart";
import { StageBreakdownChart } from "./stage-breakdown-chart";
import { TopBoardsList } from "./top-boards-list";

function boardsToEntries(boards: AnalyticsTopBoardEntry[]): { label: string; count: number }[] {
  return boards.map((b) => ({ label: b.board, count: b.count }));
}

export function AnalyticsView(): ReactElement {
  const query = useApiQuery<AnalyticsStatsDto>(
    queryKeys.analytics.stats(),
    () => apiClient.get<AnalyticsStatsDto>("/api/analytics"),
    { errorMessage: "Failed to load analytics stats" },
  );

  if (query.isPending) {
    return <Typography variant="body2Muted">Loading analytics</Typography>;
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
      <AnalyticsStatTiles stats={stats} />

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
