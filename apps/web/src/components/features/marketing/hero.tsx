"use client";

import type { ReactElement } from "react";
import { Box, Container, Grid, Stack, Typography } from "@mui/material";
import { LinkButton } from "@/components/ui/buttons";
import { fontFamilies } from "@/theme";
import { AgentTranscript } from "./agent-transcript";

export function Hero(): ReactElement {
  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      {/* Ambient brand orb — the one decorative flourish. */}
      <Box
        aria-hidden
        sx={(theme) => ({
          position: "absolute",
          top: -180,
          right: -120,
          width: 520,
          height: 520,
          background: theme.gradients.orb,
          filter: "blur(120px)",
          opacity: 0.18,
          pointerEvents: "none",
        })}
      />
      <Container maxWidth="lg" sx={{ position: "relative", paddingBlock: { xs: 6, md: 10 } }}>
        <Grid container spacing={6} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={3}>
              <Typography
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontSize: "0.75rem",
                  letterSpacing: "0.18em",
                  color: "accent.primary",
                }}
              >
                LOCAL-FIRST JOB AGENT
              </Typography>
              <Typography variant="h1" sx={{ fontSize: { xs: "2.25rem", md: "3.25rem" } }}>
                Your AI job agent, running on your machine.
              </Typography>
              <Typography variant="body1Muted" sx={{ fontSize: "1.05rem", maxWidth: 520 }}>
                JobPilot drives Claude or Codex on your own subscription to search, tailor, apply,
                and follow up — across every board, from one workspace. Your credentials and runs
                stay local.
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }}>
                <LinkButton href="/register" variant="contained" size="large">
                  Get started
                </LinkButton>
                <LinkButton href="/login" variant="outlined" size="large">
                  Sign in
                </LinkButton>
              </Stack>
              <Typography
                sx={{ fontFamily: fontFamilies.mono, fontSize: "0.75rem", color: "text.disabled" }}
              >
                Runs on your Claude / Codex subscription · Your data stays on your machine
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AgentTranscript />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
