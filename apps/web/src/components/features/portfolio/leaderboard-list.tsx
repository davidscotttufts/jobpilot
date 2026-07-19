import type { ReactElement } from "react";
import { Box, Link as MuiLink, Stack, Typography } from "@mui/material";
import type { LeaderboardRow } from "@/api/types";
import { AvailabilityBadge } from "./availability-badge";
import { PortfolioAvatar } from "./portfolio-avatar";

interface LeaderboardListProps {
  rows: LeaderboardRow[];
}

/** Ranks 4-N as a plain list; rows 1-3 render in the podium above. */
export function LeaderboardList(props: LeaderboardListProps): ReactElement {
  return (
    <Stack component="ul" spacing={0} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {props.rows.map((row) => (
        <Stack
          key={row.username}
          component="li"
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="statLabel" sx={{ width: 36, textAlign: "right" }}>
            #{row.rank}
          </Typography>
          <PortfolioAvatar name={row.displayName} size={36} availability={row.availability} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <MuiLink href={`/u/${row.username}`} sx={{ fontWeight: 600 }}>
                {row.displayName}
              </MuiLink>
              <AvailabilityBadge availability={row.availability} />
            </Stack>
            {row.headline && (
              <Typography variant="captionMuted" sx={{ overflowWrap: "anywhere" }}>
                {row.headline}
              </Typography>
            )}
          </Box>
          <Typography variant="body2Muted" sx={{ whiteSpace: "nowrap" }}>
            {row.activityCount}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
