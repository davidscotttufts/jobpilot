import type { ReactElement, ReactNode } from "react";
import { ArrowBack } from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from "@mui/material";
import type { JobListingDto } from "@/api/types";
import { LinkButton } from "@/components/ui/buttons";
import { ExternalLink, LabelValue, RelativeTime } from "@/components/ui/display";
import { formatDate, formatRelativeTime } from "@/utils/format";
import { TechChips } from "./tech-chips";

interface JobDetailProps {
  job: JobListingDto;
}

export function JobDetail(props: JobDetailProps): ReactElement {
  const { job } = props;

  return (
    <Stack spacing={3}>
      <LinkButton href="/jobs" variant="text" size="small" startIcon={<ArrowBack fontSize="sm" />}>
        All jobs
      </LinkButton>

      <Stack spacing={1.5}>
        <Typography variant="displayMd" sx={{ overflowWrap: "anywhere" }}>
          {job.title}
        </Typography>
        <Typography variant="h4" component="h2" sx={{ color: "text.secondary" }}>
          {job.company}
        </Typography>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          {job.remote && <Chip label="Remote" size="small" color="success" variant="outlined" />}
          {job.yearsExperience !== null && (
            <Chip label={`${job.yearsExperience}+ years`} size="small" variant="outlined" />
          )}
          {job.location && <Typography variant="body2Muted">{job.location}</Typography>}
          {job.employmentType && <Typography variant="body2Muted">{job.employmentType}</Typography>}
          {job.salary && (
            <Typography variant="body2Strong" sx={{ color: "accent.primary" }}>
              {job.salary}
            </Typography>
          )}
        </Stack>
      </Stack>

      <Grid container spacing={{ xs: 3, md: 4 }} sx={{ alignItems: "flex-start" }}>
        {/* CTA is first in source so it leads on a phone; `order` moves it right on md+. */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 1, md: 2 } }}>
          <Stack spacing={3}>
            <ApplyCard />
            <FactsCard job={job} />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 2, md: 1 } }}>
          <Stack spacing={4}>
            {job.descriptionExcerpt && (
              <Section title="About the role">
                {/* pre-line alone still only wraps at whitespace: one long scraped token would overflow. */}
                <Typography
                  variant="body1Muted"
                  sx={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}
                >
                  {job.descriptionExcerpt}
                </Typography>
              </Section>
            )}

            {job.requirements.length > 0 && (
              <Section title="Requirements">
                <BulletList items={job.requirements} />
              </Section>
            )}

            {job.responsibilities.length > 0 && (
              <Section title="What you'll do">
                <BulletList items={job.responsibilities} />
              </Section>
            )}

            <Divider />

            <Section title="Where this was posted">
              <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
                {job.sources.map((source) => (
                  <Stack
                    component="li"
                    key={source.url}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center", flexWrap: "wrap" }}
                  >
                    {source.board && <Chip label={source.board} size="small" variant="outlined" />}
                    <ExternalLink href={source.url} truncateTo={320}>
                      {source.url}
                    </ExternalLink>
                    <RelativeTime value={source.lastSeenAt} />
                  </Stack>
                ))}
              </Stack>
              {job.sourceCount > 1 && (
                <Typography variant="captionMuted">
                  The same posting was found on {job.sourceCount} boards and deduped into this page.
                </Typography>
              )}
              <Typography variant="captionMuted">
                Seen {formatRelativeTime(job.lastSeenAt)} ago · first found{" "}
                {formatDate(job.firstSeenAt)}
              </Typography>
            </Section>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

function Section(props: { title: string; children: ReactNode }): ReactElement {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h4" component="h3">
        {props.title}
      </Typography>
      {props.children}
    </Stack>
  );
}

function BulletList(props: { items: string[] }): ReactElement {
  return (
    <Box component="ul" sx={{ m: 0, pl: 3, display: "grid", gap: 1 }}>
      {props.items.map((item) => (
        <Typography component="li" key={item} variant="body1Muted">
          {item}
        </Typography>
      ))}
    </Box>
  );
}

function ApplyCard(): ReactElement {
  return (
    <Card variant="accent">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h4" component="h3">
            Apply with JobPilot
          </Typography>
          <Typography variant="body2Muted">
            Your own AI agent tailors your resume and fills the form - on your machine, on your
            Claude or Codex plan.
          </Typography>
          <LinkButton href="/install" variant="contained" fullWidth>
            Get the agent
          </LinkButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

function FactsCard(props: JobDetailProps): ReactNode {
  const { job } = props;
  const facts = [
    { label: "Employment", value: job.employmentType },
    { label: "Location", value: job.remote ? "Remote" : job.location },
    { label: "Salary", value: job.salary },
    { label: "Experience", value: job.yearsExperience ? `${job.yearsExperience}+ years` : null },
  ].flatMap((fact) => (fact.value ? [{ label: fact.label, value: fact.value }] : []));

  if (facts.length === 0 && job.techStack.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {facts.map((fact) => (
            <LabelValue key={fact.label} label={fact.label}>
              {fact.value}
            </LabelValue>
          ))}
          {job.techStack.length > 0 && (
            <LabelValue label="Tech stack">
              <Box sx={{ mt: 0.75 }}>
                <TechChips tech={job.techStack} linked />
              </Box>
            </LabelValue>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
