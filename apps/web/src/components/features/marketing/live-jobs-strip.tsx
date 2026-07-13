import type { ReactNode } from "react";
import { Grid, Stack, Typography } from "@mui/material";
import { cacheLife } from "next/cache";
import { api } from "@/api/client";
import { JobCard } from "@/components/features/jobs";
import { LinkButton } from "@/components/ui/buttons";
import { Section } from "./section";
import { SectionEyebrow } from "./section-eyebrow";

const SHOWN = 6;

/**
 * Real postings the agents found - the funnel into /jobs. Renders nothing when the API is down or
 * the index is empty: the landing page must never 500 over a decorative section.
 */
export async function LiveJobsStrip(): Promise<ReactNode> {
  "use cache";
  // Keeps the landing page prerendered instead of making every visit wait on the API.
  cacheLife("hours");

  const jobs = await recentJobs();
  if (jobs.length === 0) {
    return null;
  }

  return (
    <Section>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 4, alignItems: { sm: "flex-end" }, justifyContent: "space-between" }}
      >
        <Stack spacing={1}>
          <SectionEyebrow>FRESH FROM THE FLEET</SectionEyebrow>
          <Typography variant="h2">Jobs the agents found this week.</Typography>
          <Typography variant="body2Muted">
            Scraped across every board, deduped into one listing each.
          </Typography>
        </Stack>
        <LinkButton href="/jobs" variant="outlined">
          Browse all jobs
        </LinkButton>
      </Stack>
      <Grid container spacing={2}>
        {jobs.map((job) => (
          <Grid key={job.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <JobCard job={job} maxTech={4} />
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}

async function recentJobs() {
  try {
    const { data } = await api.public.jobs.get({ query: { page: 1, limit: SHOWN } });
    return data?.items ?? [];
  } catch {
    return [];
  }
}
