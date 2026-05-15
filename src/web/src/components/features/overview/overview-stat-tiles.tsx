"use client";

import type { ReactElement } from "react";
import { Box, Grid, Stack, Typography } from "@mui/material";
import type { OverviewStatsDto } from "@/types/api";

interface OverviewStatTilesProps {
  stats: OverviewStatsDto;
}

interface TileProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "success" | "danger" | "warning";
}

function Tile(props: TileProps): ReactElement {
  const { label, value, hint, accent = "default" } = props;
  return (
    <Box
      sx={(t) => ({
        p: 1.75,
        height: "100%",
        border: `1px solid ${t.palette.line.divider}`,
        borderRadius: t.radii.md,
        backgroundColor: t.palette.surfaces.card,
        boxShadow: t.shadows_custom.sm,
      })}
    >
      <Stack spacing={0.5}>
        <Typography
          variant="overlineMuted"
          sx={{ fontSize: "0.625rem", letterSpacing: "0.08em" }}
        >
          {label}
        </Typography>
        <Typography
          sx={(t) => ({
            fontSize: "1.5rem",
            fontFamily: "var(--font-fraunces), serif",
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color:
              accent === "success"
                ? t.palette.success.main
                : accent === "danger"
                  ? t.palette.error.main
                  : accent === "warning"
                    ? t.palette.warning.main
                    : t.palette.text.primary,
          })}
        >
          {value}
        </Typography>
        <Typography
          variant="captionMuted"
          sx={{ fontSize: "0.6875rem", minHeight: "1em" }}
        >
          {hint ?? ""}
        </Typography>
      </Stack>
    </Box>
  );
}

export function OverviewStatTiles(props: OverviewStatTilesProps): ReactElement {
  const { stats } = props;
  const { totals, thisWeek, responseRatePct } = stats;

  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <Tile label="Total" value={totals.applications} hint={`${totals.queueDepth} in queue`} />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <Tile
          label="Submitted"
          value={totals.submitted}
          hint={`${thisWeek.submitted} this week`}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <Tile
          label="Interviewing"
          value={totals.interviewing}
          hint={`${thisWeek.interviewing} this week`}
          accent="warning"
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <Tile label="Offers" value={totals.offers} accent="success" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <Tile
          label="Rejected"
          value={totals.rejected}
          hint={`${thisWeek.rejected} this week`}
          accent="danger"
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <Tile label="Response rate" value={`${responseRatePct}%`} />
      </Grid>
    </Grid>
  );
}
