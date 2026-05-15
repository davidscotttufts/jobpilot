"use client";

import type { ReactElement } from "react";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";

interface TopBoardsListProps {
  title: string;
  eyebrow: string;
  entries: { label: string; count: number }[];
  emptyMessage: string;
}

export function TopBoardsList(props: TopBoardsListProps): ReactElement {
  const { title, eyebrow, entries, emptyMessage } = props;
  const max = entries.reduce((m, e) => Math.max(m, e.count), 0);

  return (
    <Box
      sx={(t) => ({
        p: 2.5,
        border: `1px solid ${t.palette.line.divider}`,
        borderRadius: t.radii.md,
        backgroundColor: t.palette.surfaces.card,
        boxShadow: t.shadows_custom.sm,
        height: "100%",
      })}
    >
      <Typography variant="overlineMuted">{eyebrow}</Typography>
      <Typography variant="h6" sx={{ mt: 0.5, mb: 2, fontSize: "0.9375rem", fontWeight: 500 }}>
        {title}
      </Typography>

      {entries.length === 0 ? (
        <Typography variant="captionMuted">{emptyMessage}</Typography>
      ) : (
        <Stack spacing={1.25}>
          {entries.map((entry) => {
            const pct = max > 0 ? (entry.count / max) * 100 : 0;
            return (
              <Stack key={entry.label} spacing={0.5}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
                    {entry.label}
                  </Typography>
                  <Typography variant="captionMuted">{entry.count}</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={(t) => ({
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: t.palette.line.divider,
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: t.palette.accent.primary,
                    },
                  })}
                />
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
