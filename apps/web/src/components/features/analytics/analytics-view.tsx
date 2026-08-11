"use client";

import type { ReactElement } from "react";
import { Grid, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/api/hooks";
import { analyticsQueries } from "@/api/queries";
import { AnalyticsStatTiles } from "./analytics-stat-tiles";
import { ApplicationsTimelineChart } from "./applications-timeline-chart";
import { NeedsYouList } from "./needs-you-list";
import { NetworkingStatTiles } from "./networking-stat-tiles";
import { OutcomeBreakdown, OutcomeCaveat } from "./outcome-breakdown";
import { PortfolioRankChip } from "./portfolio-rank-chip";
import { StatusBreakdownChart } from "./status-breakdown-chart";
import { ThresholdSimulator } from "./threshold-simulator";
import { TopBoardsList } from "./top-boards-list";

function toEntries<T extends { count: number }>(
  items: T[],
  label: (item: T) => string,
): { label: string; count: number }[] {
  return items.map((item) => ({ label: label(item), count: item.count }));
}

export function AnalyticsView(): ReactElement {
  const query = useApiQuery(analyticsQueries.stats(), {
    errorMessage: "Failed to load analytics stats",
  });
  const outcomes = useApiQuery(analyticsQueries.outcomes());
  const threshold = useApiQuery(analyticsQueries.scoreThreshold());
  const needsYou = useApiQuery(analyticsQueries.needsYou());

  if (query.isPending) {
    return <Typography variant="body2Muted">Loading analytics</Typography>;
  }

  if (!query.data) {
    return <Typography variant="body2Muted">No data available.</Typography>;
  }

  const stats = query.data;

  return (
    <Stack spacing={3}>
      <PortfolioRankChip />
      <Typography variant="overlineMuted">Applications</Typography>
      <AnalyticsStatTiles stats={stats} />

      {outcomes.data && (
        <Stack spacing={2}>
          <Typography variant="overlineMuted">What came back</Typography>
          {outcomes.data.noPositiveOutcomesYet && outcomes.data.overall.applications > 0 && (
            <OutcomeCaveat
              silent={outcomes.data.overall.silent}
              total={outcomes.data.overall.applications}
            />
          )}
          <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <OutcomeBreakdown
                eyebrow="Conversion"
                title="By match score"
                rows={outcomes.data.byScoreBand}
                rejectionsOnly={outcomes.data.noPositiveOutcomesYet}
                emptyMessage="No applications yet."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <OutcomeBreakdown
                eyebrow="Conversion"
                title="By board"
                rows={outcomes.data.byBoard}
                rejectionsOnly={outcomes.data.noPositiveOutcomesYet}
                emptyMessage="No applications yet."
              />
            </Grid>
          </Grid>
        </Stack>
      )}

      {/* Independently fetched, so a slow or failed outcomes query does not hide them. */}
      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        {needsYou.data && needsYou.data.total > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <NeedsYouList total={needsYou.data.total} jobs={needsYou.data.jobs} />
          </Grid>
        )}
        {threshold.data && (
          <Grid size={{ xs: 12, md: 6 }}>
            <ThresholdSimulator
              currentThreshold={threshold.data.currentThreshold}
              skippedByThreshold={threshold.data.skippedByThreshold}
              steps={threshold.data.steps}
            />
          </Grid>
        )}
      </Grid>

      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ApplicationsTimelineChart data={stats.perDay} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatusBreakdownChart data={stats.statusBreakdown} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TopBoardsList
            eyebrow="Distribution"
            title="Top boards"
            entries={toEntries(stats.topBoards, (b) => b.board)}
            emptyMessage="No applications have been linked to a job board yet."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TopBoardsList
            eyebrow="Diagnostics"
            title="Top failure reasons"
            entries={toEntries(stats.topRejectReasons, (r) => r.reason)}
            emptyMessage="No failed campaign jobs recorded."
          />
        </Grid>
      </Grid>

      <Typography variant="overlineMuted" sx={{ mt: 1 }}>
        Networking
      </Typography>
      <NetworkingStatTiles networking={stats.networking} />

      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ApplicationsTimelineChart
            data={stats.networking.perDaySent}
            title="Messages over time"
            metricLabel="sent"
            emptyMessage="No networking messages sent yet."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TopBoardsList
            eyebrow="Distribution"
            title="Contact sources"
            entries={toEntries(stats.networking.topContactSources, (s) => s.source)}
            emptyMessage="No contacts discovered yet."
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
