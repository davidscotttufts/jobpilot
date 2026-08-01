import type { ReactElement } from "react";
import { Box, Stack, Typography } from "@mui/material";
import type { Metadata } from "next";
import { InstallGuide } from "@/components/features/install";
import {
  MarketingFooter,
  MarketingNav,
  Section,
  SectionEyebrow,
} from "@/components/features/marketing";

export const metadata: Metadata = {
  title: "Install JobPilot",
  description:
    "Add the JobPilot plugin to Claude Code or Codex, run setup, and create your account. The agent does the rest.",
  alternates: { canonical: "/install" },
};

export default function InstallPage(): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "surfaces.base", overflowX: "clip" }}>
      <MarketingNav />
      <Box component="main">
        <Section maxWidth="md">
          <Stack spacing={3}>
            <Stack spacing={2}>
              <SectionEyebrow color="accent.primary">GET STARTED</SectionEyebrow>
              <Typography variant="h1" sx={{ fontSize: { xs: "2rem", md: "2.75rem" } }}>
                Install JobPilot in two commands.
              </Typography>
              <Typography variant="body1Muted" sx={{ maxWidth: 560 }}>
                JobPilot is a plugin for the Claude Code or Codex subscription you already have. Add
                it, run setup, and the agent takes care of everything else.
              </Typography>
            </Stack>
            <InstallGuide />
          </Stack>
        </Section>
      </Box>
      <MarketingFooter />
    </Box>
  );
}
