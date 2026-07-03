"use client";

import type { ReactElement } from "react";
import { Box, Card, CardContent, Container, Grid, Link, Stack, Typography } from "@mui/material";
import NextLink from "next/link";
import { fontFamilies } from "@/theme";

interface Mode {
  tag: string;
  title: string;
  body: string;
  tone: "accent.primary" | "info.main" | "success.main" | "warning.main";
}

const MODES: Mode[] = [
  {
    tag: "search",
    title: "Search",
    body: "Find and score roles against your resume across every board.",
    tone: "info.main",
  },
  {
    tag: "auto-apply",
    title: "Auto-apply",
    body: "Let the agent apply to your high-match roles on its own.",
    tone: "accent.primary",
  },
  {
    tag: "apply",
    title: "Apply",
    body: "Queue specific URLs and apply one by one, tailored each time.",
    tone: "success.main",
  },
  {
    tag: "outreach",
    title: "Outreach",
    body: "Find the hiring manager and message them by email or LinkedIn.",
    tone: "warning.main",
  },
];

export function CampaignTypes(): ReactElement {
  return (
    <Container maxWidth="lg" sx={{ paddingBlock: { xs: 6, md: 9 } }}>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: fontFamilies.mono,
            fontSize: "0.75rem",
            letterSpacing: "0.18em",
            color: "text.secondary",
          }}
        >
          FOUR WAYS TO RUN
        </Typography>
        <Typography variant="h2">One workspace, every approach to the search.</Typography>
      </Stack>
      <Grid container spacing={2}>
        {MODES.map((mode) => (
          <Grid key={mode.tag} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Box
                    component="span"
                    sx={{
                      alignSelf: "flex-start",
                      fontFamily: fontFamilies.mono,
                      fontSize: "0.7rem",
                      color: mode.tone,
                      borderLeft: 2,
                      borderColor: mode.tone,
                      pl: 1,
                    }}
                  >
                    {mode.tag}
                  </Box>
                  <Typography variant="h3" sx={{ fontSize: "1.15rem" }}>
                    {mode.title}
                  </Typography>
                  <Typography variant="body2Muted">{mode.body}</Typography>
                </Stack>
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
    </Container>
  );
}
