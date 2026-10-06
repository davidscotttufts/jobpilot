"use client";

import { type ReactElement, useState } from "react";
import { Box, Grid, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Glow } from "../glow";
import { CampaignsPanel } from "../mock-panels/campaigns-panel";
import { InboxPanel } from "../mock-panels/inbox-panel";
import { ResumePanel } from "../mock-panels/resume-panel";
import { UpworkPanel } from "../mock-panels/upwork-panel";
import { WorkspacePanel } from "../mock-panels/workspace-panel";
import { Section } from "../section";
import { SectionHeading } from "../section-heading";

interface TourStop {
  id: string;
  label: string;
  title: string;
  body: string;
  panel: ReactElement;
}

const STOPS: TourStop[] = [
  {
    id: "workspace",
    label: "Applications",
    title: "Every application in one place.",
    body: "The agent records each application as it sends it, so you can follow it from applied to offer without a spreadsheet.",
    panel: <WorkspacePanel />,
  },
  {
    id: "inbox",
    label: "Inbox",
    title: "Replies sorted for you.",
    body: "JobPilot reads recruiter emails in your Gmail, works out whether each is an interview, a rejection, or an offer, and links it to the right application. You confirm before anything changes.",
    panel: <InboxPanel />,
  },
  {
    id: "resumes",
    label: "Resumes",
    title: "A tailored resume for each job.",
    body: "You keep one main resume. For each application the agent makes a copy aimed at that job and saves it as a PDF, so you can always see which version you sent where.",
    panel: <ResumePanel />,
  },
  {
    id: "campaigns",
    label: "Campaigns",
    title: "Or run each step yourself.",
    body: "Campaigns handle one search, a list of job links, or a round of messages when you want to drive. You start each one from the dashboard and watch the agent work.",
    panel: <CampaignsPanel />,
  },
  {
    id: "upwork",
    label: "Upwork",
    title: "Upwork jobs worth bidding on.",
    body: "It skips clients who rarely hire or have never spent money, then ranks the rest. It drafts proposals and profile updates, and you approve each one.",
    panel: <UpworkPanel />,
  },
];

export function ProductTour(): ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = STOPS[activeIndex];

  return (
    <Section>
      <SectionHeading
        eyebrow="The dashboard"
        title="Everything the agent does, in one place."
        lead="The agent works on your computer. The dashboard is where you see the results and step in."
      />
      <Tabs
        value={activeIndex}
        onChange={(_, next: number) => setActiveIndex(next)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Dashboard features"
        sx={{ mt: 4, mb: { xs: 4, md: 6 } }}
      >
        {STOPS.map((stop) => (
          <Tab
            key={stop.id}
            label={stop.label}
            id={`tour-tab-${stop.id}`}
            aria-controls="tour-panel"
          />
        ))}
      </Tabs>
      <Grid
        container
        spacing={{ xs: 4, md: 8 }}
        role="tabpanel"
        id="tour-panel"
        aria-labelledby={`tour-tab-${active.id}`}
        sx={{ alignItems: "center", minHeight: { md: 360 } }}
      >
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={1.5}>
            <Typography variant="h3">{active.title}</Typography>
            <Typography variant="lead">{active.body}</Typography>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }} sx={{ position: "relative" }}>
          <Glow placement="center" bleed={48} />
          <Box sx={{ position: "relative" }}>{active.panel}</Box>
        </Grid>
      </Grid>
    </Section>
  );
}
