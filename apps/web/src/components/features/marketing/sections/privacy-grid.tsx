import type { ReactElement, ReactNode } from "react";
import { Card, CardContent, Grid, Link, Stack, Typography } from "@mui/material";
import { GITHUB_URL } from "@/lib/constants";
import { Section } from "../section";
import { SectionEyebrow } from "../section-eyebrow";

const FACTS = [
  {
    title: "Uses your subscription",
    body: "The agent runs on your Claude or Codex plan. JobPilot has no AI keys of its own and charges nothing per job.",
  },
  {
    title: "Runs on your computer",
    body: "The agent and its browser run on your own machine. You can watch everything it does and stop it at any time.",
  },
  {
    title: "Encrypted logins",
    body: "Job board passwords and captcha keys are encrypted with a key that belongs only to your account.",
  },
  {
    title: "Your own Gmail connection",
    body: "You connect Gmail through a Google app you create yourself, so your email never passes through a shared one.",
  },
];

interface FactCardProps {
  title: string;
  children: ReactNode;
}

function FactCard(props: FactCardProps): ReactElement {
  const { title, children } = props;
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h4" component="h3">
            {title}
          </Typography>
          <Typography variant="body2Muted">{children}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function PrivacyGrid(): ReactElement {
  return (
    <Section>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <SectionEyebrow>PRIVACY</SectionEyebrow>
        <Typography variant="h2">Free, open source, and on your computer.</Typography>
      </Stack>
      <Grid container spacing={2}>
        {FACTS.map((fact) => (
          <Grid key={fact.title} size={{ xs: 12, sm: 6 }}>
            <FactCard title={fact.title}>{fact.body}</FactCard>
          </Grid>
        ))}
        <Grid size={12}>
          <FactCard title="Open source">
            All of JobPilot, from the website to the agent, is{" "}
            {/* component="a": next/link is the theme's MuiLink default, wrong for an off-site URL. */}
            <Link component="a" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              public on GitHub
            </Link>
            .
          </FactCard>
        </Grid>
      </Grid>
    </Section>
  );
}
