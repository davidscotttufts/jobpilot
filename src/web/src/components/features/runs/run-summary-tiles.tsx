"use client";

import type { ReactElement } from "react";
import { Grid } from "@mui/material";
import { StatCard } from "@/components/ui/display";
import type { RunDetailDto } from "@/types/api";

interface RunSummaryTilesProps {
  run: RunDetailDto;
}

export function RunSummaryTiles(props: RunSummaryTilesProps): ReactElement {
  const { run } = props;
  const s = run.summary;
  const showRemaining = typeof run.config.maxApplications === "number";
  const tileSize = { xs: 6, sm: 4, md: 2 };

  return (
    <Grid container spacing={2}>
      <Grid size={tileSize}>
        <StatCard label="Found" value={s.totalFound} />
      </Grid>
      <Grid size={tileSize}>
        <StatCard label="Qualified" value={s.qualified} />
      </Grid>
      <Grid size={tileSize}>
        <StatCard label="Applied" value={s.applied} />
      </Grid>
      <Grid size={tileSize}>
        <StatCard label="Failed" value={s.failed} />
      </Grid>
      <Grid size={tileSize}>
        <StatCard label="Skipped" value={s.skipped} />
      </Grid>
      {showRemaining && (
        <Grid size={tileSize}>
          <StatCard label="Remaining" value={s.remaining} />
        </Grid>
      )}
    </Grid>
  );
}
