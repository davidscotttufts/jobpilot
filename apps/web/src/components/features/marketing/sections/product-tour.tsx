import type { ReactElement } from "react";
import { alpha, Box, Grid, Stack, Typography } from "@mui/material";
import { accent, feedback } from "@/theme";
import { InboxPanel } from "../mock-panels/inbox-panel";
import { ResumePanel } from "../mock-panels/resume-panel";
import { UpworkPanel } from "../mock-panels/upwork-panel";
import { WorkspacePanel } from "../mock-panels/workspace-panel";
import { Section } from "../section";
import { SectionEyebrow } from "../section-eyebrow";
import { SectionGlow } from "../section-glow";

interface TourRow {
  eyebrow: string;
  title: string;
  body: string;
  panel: ReactElement;
  /** Quiet radial wash behind the panel, tone-matched to its content. */
  glow: string;
}

const ROWS: TourRow[] = [
  {
    eyebrow: "WORKSPACE",
    title: "Every application in one place.",
    body: "The agent records each application as it sends it, so you can follow it from applied to offer without a spreadsheet.",
    panel: <WorkspacePanel />,
    glow: alpha(accent.primary, 0.07),
  },
  {
    eyebrow: "INBOX",
    title: "Replies sorted for you.",
    body: "JobPilot reads recruiter emails in your Gmail, works out whether each is an interview, a rejection, or an offer, and links it to the right application. You confirm before anything changes.",
    panel: <InboxPanel />,
    glow: alpha(accent.secondary, 0.07),
  },
  {
    eyebrow: "RESUME STUDIO",
    title: "A tailored resume for each job.",
    body: "You keep one main resume. For each application the agent makes a copy aimed at that job and saves it as a PDF, so you can always see which version you sent where.",
    panel: <ResumePanel />,
    glow: alpha(feedback.success, 0.06),
  },
  {
    eyebrow: "UPWORK",
    title: "Upwork jobs worth bidding on.",
    body: "It skips clients who rarely hire or have never spent money, then ranks the rest. It drafts proposals and profile updates, and you approve each one.",
    panel: <UpworkPanel />,
    glow: alpha(accent.primary, 0.07),
  },
];

export function ProductTour(): ReactElement {
  return (
    <Section>
      <Stack spacing={{ xs: 8, md: 12 }}>
        {ROWS.map((row, i) => (
          <Grid
            key={row.eyebrow}
            container
            spacing={{ xs: 3, md: 8 }}
            direction={i % 2 ? "row-reverse" : "row"}
            sx={{ alignItems: "center" }}
          >
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1.5}>
                <SectionEyebrow color="accent.primary">{row.eyebrow}</SectionEyebrow>
                <Typography variant="h2">{row.title}</Typography>
                <Typography variant="body1Muted" sx={{ fontSize: "0.9375rem", maxWidth: 440 }}>
                  {row.body}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }} sx={{ position: "relative" }}>
              <SectionGlow color={row.glow} />
              <Box sx={{ position: "relative" }}>{row.panel}</Box>
            </Grid>
          </Grid>
        ))}
      </Stack>
    </Section>
  );
}
