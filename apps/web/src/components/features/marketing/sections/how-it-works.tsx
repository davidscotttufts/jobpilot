import type { ReactElement } from "react";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { fontFamilies, line, radii } from "@/theme";
import { Section } from "../section";

const STEPS = [
  {
    title: "Install the plugin",
    body: "Add JobPilot to Claude Code or Codex and run setup. It installs the agent on your computer and starts it.",
    snippet: "/plugin install jobpilot  ·  /jobpilot:setup",
  },
  {
    title: "Create your account",
    body: "Sign up and upload your resume. The agent reads it and fills in your profile, which it uses for scoring and applying.",
    snippet: "jobpilot.suxrobgm.net/register",
  },
  {
    title: "Start applying",
    body: "Everything after setup happens in the dashboard. Run a search first to check the matches, then let it apply.",
    snippet: "New campaign  ·  Search → Auto-apply",
  },
];

export function HowItWorks(): ReactElement {
  return (
    <Box
      id="how-it-works"
      sx={{ borderBlock: 1, borderColor: "line.divider", backgroundColor: "surfaces.card" }}
    >
      <Section>
        <Typography variant="h2" sx={{ mb: 4 }}>
          Up and running in three steps.
        </Typography>
        <Grid container spacing={4}>
          {STEPS.map((step, i) => (
            <Grid key={step.title} size={{ xs: 12, md: 4 }}>
              <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
                <Typography
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "accent.primary",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </Typography>
                <Typography variant="h3" sx={{ fontSize: "1.2rem" }}>
                  {step.title}
                </Typography>
                <Typography variant="body2Muted">{step.body}</Typography>
                <Box
                  component="code"
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    backgroundColor: "surfaces.elevated",
                    border: `1px solid ${line.divider}`,
                    borderRadius: radii.sm,
                    paddingInline: 1,
                    paddingBlock: 0.5,
                  }}
                >
                  {step.snippet}
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Section>
    </Box>
  );
}
