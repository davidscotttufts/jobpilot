"use client";

import type { ReactElement } from "react";
import { Grid } from "@mui/material";
import { useApiQuery } from "@/api/hooks";
import { applicationQueries, campaignQueries } from "@/api/queries";
import { StatCard } from "@/components/ui/display";
import { INTERVIEW_STATUSES } from "../applications/funnel-bar";

export function StatTiles(): ReactElement {
  const campaigns = useApiQuery(campaignQueries.list());
  // Counts come from the server aggregate, not a loaded page - these are whole-account totals.
  const applications = useApiQuery(applicationQueries.summary());

  const rows = campaigns.data?.items ?? [];
  const byStatus = applications.data?.byStatus;

  const active = rows.filter((c) => c.status === "in_progress" || c.status === "paused").length;
  const interviewing = INTERVIEW_STATUSES.reduce((n, s) => n + (byStatus?.[s] ?? 0), 0);
  const replies = rows.reduce(
    (n, c) => n + (c.summary.kind === "networking" ? c.summary.replied : 0),
    0,
  );

  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard label="Active campaigns" value={active} />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard label="Applied" value={applications.data?.total ?? 0} />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard label="Interviewing" value={interviewing} />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard label="Replies" value={replies} />
      </Grid>
    </Grid>
  );
}
