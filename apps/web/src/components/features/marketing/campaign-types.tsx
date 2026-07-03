"use client";

import type { ReactElement } from "react";
import { Box, Card, CardContent, Grid, Link, Stack, Typography } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import NextLink from "next/link";
import { fontFamilies } from "@/theme";
import { panelCellSx } from "./mock-panels/panel-frame";
import { Section } from "./section";
import { SectionEyebrow } from "./section-eyebrow";

interface Mode {
  tag: string;
  title: string;
  body: string;
  command: string;
  tone: "info" | "accent" | "success" | "warning";
}

const MODES: Mode[] = [
  {
    tag: "search",
    title: "Search",
    body: "Find and score roles against your resume across every board.",
    command: "/jobpilot:search",
    tone: "info",
  },
  {
    tag: "auto-apply",
    title: "Auto-apply",
    body: "Let the agent apply to your high-match roles on its own.",
    command: "/jobpilot:auto-apply",
    tone: "accent",
  },
  {
    tag: "apply",
    title: "Apply",
    body: "Queue specific URLs and apply one by one, tailored each time.",
    command: "/jobpilot:apply <url>",
    tone: "success",
  },
  {
    tag: "outreach",
    title: "Outreach",
    body: "Find the hiring manager and message them by email or LinkedIn.",
    command: "/jobpilot:outreach",
    tone: "warning",
  },
];

const toneColor = (theme: Theme, tone: Mode["tone"]): string =>
  tone === "accent" ? theme.palette.accent.primary : theme.palette[tone].main;

export function CampaignTypes(): ReactElement {
  return (
    <Section>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <SectionEyebrow>FOUR WAYS TO RUN</SectionEyebrow>
        <Typography variant="h2">One workspace, every approach to the search.</Typography>
      </Stack>
      <Grid container spacing={2}>
        {MODES.map((mode) => (
          <Grid key={mode.tag} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={(theme) => {
                const tone = toneColor(theme, mode.tone);
                return {
                  height: "100%",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    borderColor: `${tone}80`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 32px -16px ${tone}59`,
                  },
                };
              }}
            >
              <CardContent
                sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}
              >
                <Box
                  component="span"
                  sx={(theme) => ({
                    alignSelf: "flex-start",
                    fontFamily: fontFamilies.mono,
                    fontSize: "0.7rem",
                    color: toneColor(theme, mode.tone),
                    borderLeft: 2,
                    borderColor: toneColor(theme, mode.tone),
                    pl: 1,
                  })}
                >
                  {mode.tag}
                </Box>
                <Typography variant="h3" sx={{ fontSize: "1.15rem" }}>
                  {mode.title}
                </Typography>
                <Typography variant="body2Muted">{mode.body}</Typography>
                <Box
                  component="code"
                  sx={(theme) => ({
                    ...panelCellSx(theme),
                    mt: "auto",
                    px: 1,
                    py: 0.5,
                    fontFamily: fontFamilies.mono,
                    fontSize: "0.7rem",
                    color: "text.secondary",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  })}
                >
                  {mode.command}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Typography variant="body2Muted" sx={{ mt: 3 }}>
        Every mode is a skill you can also run by hand from the agent -{" "}
        <Link component={NextLink} href="/docs/campaigns-and-skills">
          see the docs
        </Link>
        .
      </Typography>
    </Section>
  );
}
