import { type ReactElement, Suspense } from "react";
import { JOB_LISTING_FILTER_KEYS } from "@jobpilot/contracts/job-listing";
import { Grid, Skeleton, Stack, Typography } from "@mui/material";
import type { Metadata } from "next";
import { api } from "@/api/client";
import { JobCard, JobFilters, JobPager } from "@/components/features/jobs";
import { JsonLd } from "@/components/seo/json-ld";
import { EmptyState } from "@/components/ui/data";
import { breadcrumbLd } from "@/lib/structured-data";
import { one, pageParam } from "@/utils/search-params";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "Browse software jobs discovered and deduped by JobPilot agents across LinkedIn, Indeed, Wellfound, Y Combinator and more. Apply with your own AI agent.",
  alternates: { canonical: "/jobs" },
};

interface JobsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function JobsPage(props: JobsPageProps): ReactElement {
  const { searchParams } = props;

  return (
    <Stack spacing={4}>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Jobs", path: "/jobs" },
        ])}
      />
      <Stack spacing={1}>
        <Typography variant="h1" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" } }}>
          Jobs found by JobPilot agents
        </Typography>
        <Typography variant="body1Muted">
          Real postings scraped across every board, deduped into one listing each. Apply to any of
          them with your own agent.
        </Typography>
      </Stack>

      <JobFilters />

      {/* searchParams is dynamic, so the results need their own boundary; the shell prerenders. */}
      <Suspense fallback={<JobsSkeleton />}>
        <JobsResults searchParams={searchParams} />
      </Suspense>
    </Stack>
  );
}

async function JobsResults(props: JobsPageProps): Promise<ReactElement> {
  const params = await props.searchParams;

  const filters: Record<string, string> = {};
  for (const key of JOB_LISTING_FILTER_KEYS) {
    const value = one(params[key]);
    if (value) {
      filters[key] = value;
    }
  }

  const { data, error } = await api.public.jobs.get({
    query: { ...filters, page: pageParam(params.page), limit: 24 },
  });

  if (error || !data) {
    return (
      <EmptyState
        title="Jobs are unavailable right now"
        description="We couldn't reach the job index. Try again in a moment."
      />
    );
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        title="No jobs match those filters"
        description="Try a broader search, or clear the filters to see everything the agents have found."
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        {data.items.map((job) => (
          <Grid key={job.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <JobCard job={job} />
          </Grid>
        ))}
      </Grid>
      <JobPager
        page={data.pagination.page}
        totalPages={data.pagination.totalPages}
        total={data.pagination.total}
        params={filters}
      />
    </Stack>
  );
}

const SKELETON_SLOTS = ["a", "b", "c", "d", "e", "f"];

function JobsSkeleton(): ReactElement {
  return (
    <Grid container spacing={2}>
      {SKELETON_SLOTS.map((slot) => (
        <Grid key={slot} size={{ xs: 12, sm: 6, md: 4 }}>
          <Skeleton variant="rectangular" height={180} />
        </Grid>
      ))}
    </Grid>
  );
}
