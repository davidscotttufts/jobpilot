import type { ReactElement } from "react";
import { Card, CardActionArea, CardContent, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import type { JobListingSummaryDto } from "@/api/types";
import { jobMetaLine, RemoteBadge } from "./job-meta";
import { SkillChips } from "./skill-chips";

interface JobCardProps {
  job: JobListingSummaryDto;
}

export function JobCard(props: JobCardProps): ReactElement {
  const { job } = props;

  return (
    <Card variant="lift">
      {/* CardActionArea is a ButtonBase, so the theme's NextLink default makes `href` a client link
          with no `component` prop, and this card stays a server component. */}
      <CardActionArea href={`/jobs/${job.slug}` as Route} sx={{ height: "100%" }}>
        <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Stack spacing={0.5}>
            {/* Scraped titles can be one long unbroken token; on a phone that overflows the card. */}
            <Typography variant="h4" component="h3" sx={{ overflowWrap: "anywhere" }}>
              {job.title}
            </Typography>
            <Typography variant="body2Muted">{job.company}</Typography>
          </Stack>

          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            <RemoteBadge job={job} />
            {job.location && <Typography variant="captionMuted">{job.location}</Typography>}
            {job.salary && <Typography variant="body2Strong">{job.salary}</Typography>}
          </Stack>

          <SkillChips skills={job.skills} max={4} />

          <Typography variant="captionMuted" sx={{ mt: "auto" }}>
            {jobMetaLine(job)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
