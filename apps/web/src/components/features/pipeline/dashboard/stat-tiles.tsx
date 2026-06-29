"use client";

import type { ReactElement } from "react";
import { Grid } from "@mui/material";
import { api } from "@/api/client";
import { useApiQuery } from "@/api/hooks";
import { queryKeys } from "@/api/query-keys";
import type { ApplicationDto, CampaignDto } from "@/api/types";
import { StatCard } from "@/components/ui/display";
import { INTERVIEW_STAGES } from "../applications/funnel-bar";

export function StatTiles(): ReactElement {
  const campaigns = useApiQuery<CampaignDto[]>(queryKeys.campaigns.list(), () => api.campaigns.get());
  const applications = useApiQuery<ApplicationDto[]>(queryKeys.applications.list({}), () =>
    api.applied.get({ query: {} }),
  );

  const rows = campaigns.data ?? [];
  const apps = applications.data ?? [];

  const active = rows.filter((c) => c.status === "in_progress" || c.status === "paused").length;
  const interviewing = apps.filter((a) => INTERVIEW_STAGES.has(a.stage)).length;
  const replies = rows.reduce((n, c) => n + c.summary.replied, 0);

  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard label="Active campaigns" value={active} />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard label="Applied" value={apps.length} />
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
