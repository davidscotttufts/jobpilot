"use client";

import type { ReactElement } from "react";
import { Box, Container, Grid, Stack, Typography } from "@mui/material";
import { fontFamilies } from "@/theme";

const STEPS = [
  {
    title: "Connect your agent",
    body: "Run JobPilot locally — it drives Claude or Codex through your own terminal, on your subscription.",
  },
  {
    title: "Launch a campaign",
    body: "Pick a mode, set your resume and filters, and let the agent work through the roles.",
  },
  {
    title: "Track everything",
    body: "Watch live progress and follow every application through the funnel to an offer.",
  },
];

export function HowItWorks(): ReactElement {
  return (
    <Box sx={{ borderBlock: 1, borderColor: "line.divider", backgroundColor: "surfaces.card" }}>
      <Container maxWidth="lg" sx={{ paddingBlock: { xs: 6, md: 9 } }}>
        <Typography variant="h2" sx={{ mb: 4 }}>
          From zero to applied in three steps.
        </Typography>
        <Grid container spacing={4}>
          {STEPS.map((step, i) => (
            <Grid key={step.title} size={{ xs: 12, md: 4 }}>
              <Stack spacing={1.5}>
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
      </Container>
    </Box>
  );
}
