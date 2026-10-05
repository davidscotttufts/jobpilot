import type { ReactElement } from "react";
import { alpha, Box, Container, Grid, Link, Stack, Typography } from "@mui/material";
import { LinkButton } from "@/components/ui/buttons";
import { accent, fontFamilies } from "@/theme";
import { SectionEyebrow } from "../section-eyebrow";
import { PilotCycle } from "./pilot-cycle";

// A server component: a `(theme) => …` sx callback can't cross the RSC boundary.
const emberWash = `radial-gradient(ellipse 70% 70% at 50% 0%, ${alpha(accent.primary, 0.08)}, transparent 60%)`;

interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: "Say what you want",
    body: "Describe the jobs you're after in a few sentences, then set a daily application limit and decide whether it may email recruiters for you.",
  },
  {
    title: "It gets to work",
    body: "It looks for jobs, scores them against your resume, applies to the good ones, and finds people worth contacting. When there's nothing to do, the AI stays off and uses none of your quota.",
  },
  {
    title: "Answer from your phone",
    body: "If it needs you, say for a salary question, a login code, or approval to send a message, you get a notification. Answer it and the job carries on.",
  },
  {
    title: "See what it did",
    body: "Everything it does goes into a journal, and each morning you get a summary of applications sent and replies received. Your limits are enforced by the server, so the AI can't go past them.",
  },
];

export function Pilot(): ReactElement {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderBlock: 1,
        borderColor: "line.divider",
        backgroundColor: "surfaces.card",
      }}
    >
      <Box
        aria-hidden
        sx={{ position: "absolute", inset: 0, background: emberWash, pointerEvents: "none" }}
      />
      <Container maxWidth="lg" sx={{ position: "relative", paddingBlock: { xs: 7, md: 10 } }}>
        <Grid container spacing={{ xs: 4, md: 6 }} sx={{ mb: 6, alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <SectionEyebrow color="accent.primary">THE PILOT</SectionEyebrow>
              <Typography variant="h2">Let it run your job search for you.</Typography>
              <Typography variant="body1Muted" sx={{ fontSize: "0.9375rem" }}>
                Turn on the Pilot and JobPilot keeps working without you. You set the goals and the
                limits. It searches, applies, and follows up on its own, and asks you when it needs
                a decision.
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PilotCycle />
          </Grid>
        </Grid>
        <Grid container spacing={4}>
          {STEPS.map((step, i) => (
            <Grid key={step.title} size={{ xs: 12, sm: 6, md: 3 }}>
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
              </Stack>
            </Grid>
          ))}
        </Grid>
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 5, flexWrap: "wrap", gap: 2, alignItems: "center" }}
        >
          <LinkButton href="/install" variant="contained" size="large">
            Get started
          </LinkButton>
          <Typography variant="body2Muted">
            <Link href="/docs/pilot">Read the Pilot guide</Link>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
