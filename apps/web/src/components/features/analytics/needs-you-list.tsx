"use client";

import type { ReactElement } from "react";
import { Card, CardContent, Chip, Link as MuiLink, Stack, Typography } from "@mui/material";

interface NeedsYouJob {
  campaignId: string;
  key: string;
  title: string;
  company: string;
  url: string;
  blockedBy: "captcha" | "unanswered-question";
}

interface NeedsYouListProps {
  total: number;
  jobs: NeedsYouJob[];
}

const LABEL: Record<NeedsYouJob["blockedBy"], string> = {
  captcha: "CAPTCHA",
  "unanswered-question": "needed an answer",
};

export function NeedsYouList(props: NeedsYouListProps): ReactElement {
  const { total, jobs } = props;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overlineMuted">Worth five minutes</Typography>
        <Typography variant="h5" sx={{ mt: 0.5 }}>
          Only you can finish these
        </Typography>
        <Typography variant="body2Muted" sx={{ mt: 1, mb: 2 }}>
          {total} postings were skipped for something the agent cannot do but you can - a CAPTCHA it
          must not hand-click, or a question that expired. Jobs no amount of attention changes, like
          a clearance requirement, are not listed.
        </Typography>

        <Stack spacing={1.25}>
          {jobs.map((job) => (
            <Stack key={`${job.campaignId}-${job.key}`} spacing={0.25}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap" }}>
                <MuiLink href={job.url} target="_blank" rel="noopener noreferrer" variant="body1">
                  {job.title}
                </MuiLink>
                <Chip size="small" label={LABEL[job.blockedBy]} />
              </Stack>
              <Typography variant="captionMuted">{job.company}</Typography>
            </Stack>
          ))}
        </Stack>

        {total > jobs.length && (
          <Typography variant="captionMuted" sx={{ display: "block", mt: 2 }}>
            Showing the {jobs.length} most recent - a posting goes stale fast, so these are the ones
            still likely to be open.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
