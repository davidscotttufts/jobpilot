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
    "Add the JobPilot plugin to Claude Code or Codex, run setup, and create your account.",
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
                Install JobPilot
              </Typography>
              <Typography variant="body1Muted" sx={{ maxWidth: 560 }}>
                JobPilot is a plugin for Claude Code and Codex. Add it, run setup, and create an
                account. After that you control everything from the dashboard.
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
