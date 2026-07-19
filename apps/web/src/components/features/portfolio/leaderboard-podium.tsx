import type { ReactElement } from "react";
import { Card, CardContent, Link as MuiLink, Stack, Typography } from "@mui/material";
import type { LeaderboardRow } from "@/api/types";
import { AvailabilityBadge } from "./availability-badge";
import { PortfolioAvatar } from "./portfolio-avatar";

interface LeaderboardPodiumProps {
  rows: LeaderboardRow[];
}

/** Gold/silver/bronze via theme feedback tokens - no raw hex. */
const MEDAL = ["warning.main", "text.secondary", "accent.dark"] as const;

/** Top-3 highlight. Renders however many of the first three exist (0-3). */
export function LeaderboardPodium(props: LeaderboardPodiumProps): ReactElement {
  const top = props.rows.slice(0, 3);

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
      {top.map((row) => (
        <Card key={row.username} variant="accent" sx={{ flex: 1 }}>
          <CardContent>
            <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center" }}>
              <Typography variant="statValue" sx={{ color: MEDAL[row.rank - 1] ?? "text.primary" }}>
                #{row.rank}
              </Typography>
              <PortfolioAvatar name={row.displayName} size={56} availability={row.availability} />
              <Stack spacing={0.25} sx={{ alignItems: "center" }}>
                <MuiLink href={`/u/${row.username}`} sx={{ fontWeight: 600 }}>
                  {row.displayName}
                </MuiLink>
                {row.headline && (
                  <Typography variant="captionMuted" sx={{ overflowWrap: "anywhere" }}>
                    {row.headline}
                  </Typography>
                )}
                <AvailabilityBadge availability={row.availability} />
                <Typography variant="body2Muted">{row.activityCount} activities</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
