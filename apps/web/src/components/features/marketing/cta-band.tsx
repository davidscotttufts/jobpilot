"use client";

import type { ReactElement } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { LinkButton } from "@/components/ui/buttons";

export function CtaBand(): ReactElement {
  return (
    <Container maxWidth="lg" sx={{ paddingBlock: { xs: 6, md: 10 } }}>
      <Box
        sx={(theme) => ({
          position: "relative",
          overflow: "hidden",
          borderRadius: theme.radii.lg,
          border: `1px solid ${theme.palette.line.border}`,
          backgroundColor: theme.palette.surfaces.card,
          paddingBlock: { xs: 5, md: 7 },
          paddingInline: { xs: 3, md: 6 },
        })}
      >
        <Box
          aria-hidden
          sx={(theme) => ({
            position: "absolute",
            inset: 0,
            background: theme.gradients.reversed,
            opacity: 0.08,
            pointerEvents: "none",
          })}
        />
        <Stack spacing={3} sx={{ position: "relative", alignItems: "flex-start" }}>
          <Typography variant="h2" sx={{ maxWidth: 620 }}>
            Put your job search on autopilot.
          </Typography>
          <Typography variant="body1Muted" sx={{ maxWidth: 520 }}>
            Create an account, install the agent, run your first campaign tonight.
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }}>
            <LinkButton href="/register" variant="contained" size="large">
              Get started
            </LinkButton>
            <LinkButton href="/docs" variant="outlined" size="large">
              Read the docs
            </LinkButton>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
}
