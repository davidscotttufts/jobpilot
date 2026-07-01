"use client";

import type { ReactElement } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { fontFamilies } from "@/theme";

/** A line in the faux agent transcript. `tone` maps to a brand status color. */
interface Line {
  text: string;
  tone: "prompt" | "ok" | "step" | "muted";
}

const LINES: Line[] = [
  { text: '$ jobpilot apply --campaign "Senior Frontend"', tone: "prompt" },
  { text: "✓ Signed in to linkedin.com", tone: "ok" },
  { text: "→ Scoring 24 roles against your resume", tone: "step" },
  { text: "✓ Stripe · Senior Frontend Engineer - 92% match", tone: "ok" },
  { text: "→ Tailoring resume + cover letter", tone: "step" },
  { text: "✓ Application submitted", tone: "ok" },
  { text: "→ 11 applied · 3 interviewing · 0 failed", tone: "muted" },
];

const TONE_COLOR: Record<Line["tone"], string> = {
  prompt: "accent.primary",
  ok: "success.main",
  step: "info.main",
  muted: "text.secondary",
};

/**
 * The page signature: a terminal transcript of the local agent running a
 * campaign - the literal thing JobPilot does, not a decorative chart.
 */
export function AgentTranscript(): ReactElement {
  return (
    <Box
      sx={(theme) => ({
        borderRadius: theme.radii.lg,
        border: `1px solid ${theme.palette.line.border}`,
        backgroundColor: theme.palette.surfaces.card,
        boxShadow: theme.shadows_custom.lg,
        overflow: "hidden",
      })}
    >
      <Stack
        direction="row"
        spacing={0.75}
        sx={(theme) => ({
          alignItems: "center",
          paddingInline: 1.5,
          height: 36,
          borderBottom: `1px solid ${theme.palette.line.divider}`,
          backgroundColor: theme.palette.surfaces.elevated,
        })}
      >
        {(["error.main", "warning.main", "success.main"] as const).map((c) => (
          <Box key={c} sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />
        ))}
        <Typography variant="captionMuted" sx={{ fontFamily: fontFamilies.mono, pl: 1 }}>
          agent - claude
        </Typography>
      </Stack>
      <Stack spacing={0.75} sx={{ padding: 2 }}>
        {LINES.map((line) => (
          <Typography
            key={line.text}
            sx={{
              fontFamily: fontFamilies.mono,
              fontSize: "0.8125rem",
              lineHeight: 1.6,
              color: TONE_COLOR[line.tone],
            }}
          >
            {line.text}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}
