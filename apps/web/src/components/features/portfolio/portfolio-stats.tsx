import type { ReactElement } from "react";
import { Grid } from "@mui/material";
import type { PortfolioStats } from "@/api/types";
import { StatTile } from "@/components/features/analytics/stat-tile";

interface PortfolioStatsRowProps {
  stats: PortfolioStats;
}

interface Tile {
  label: string;
  value: string | number;
  accent?: "success" | "warning";
}

/** Compact tile row above the heatmap - turns the grid into a story, not decoration. */
export function PortfolioStatsRow(props: PortfolioStatsRowProps): ReactElement {
  const { stats } = props;
  const tiles: Tile[] = [
    { label: "Applications", value: stats.applications },
    { label: "Interviewing", value: stats.interviews, accent: "warning" },
    { label: "Messages sent", value: stats.messagesSent },
    { label: "Last 30 days", value: stats.activityLast30 },
    { label: "Current streak", value: `${stats.currentStreak}d`, accent: "success" },
    { label: "Longest streak", value: `${stats.longestStreak}d` },
  ];

  return (
    <Grid container spacing={1.5}>
      {tiles.map((tile) => (
        <Grid key={tile.label} size={{ xs: 6, sm: 4, md: 2 }}>
          <StatTile label={tile.label} value={tile.value} accent={tile.accent} />
        </Grid>
      ))}
    </Grid>
  );
}
