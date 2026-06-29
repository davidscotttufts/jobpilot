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
            Create an account and run your first campaign in minutes.
          </Typography>
          <LinkButton href="/register" variant="contained" size="large">
            Get started
          </LinkButton>
        </Stack>
      </Box>
    </Container>
  );
}
