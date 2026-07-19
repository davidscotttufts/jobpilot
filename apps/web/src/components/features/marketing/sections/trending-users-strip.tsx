import type { ReactNode } from "react";
import { Card, CardContent, Grid, Link as MuiLink, Stack, Typography } from "@mui/material";
import { cacheLife } from "next/cache";
import { api } from "@/api/client";
import type { LeaderboardRow } from "@/api/types";
import { PortfolioAvatar } from "@/components/features/portfolio";
import { LinkButton } from "@/components/ui/buttons";
import { Section } from "../section";
import { SectionEyebrow } from "../section-eyebrow";

const SHOWN = 5;

/**
 * Renders nothing only when there is nobody to show or the API is down - never 500 over a decorative
 * section. Cached like the live-jobs strip so the fetch runs inside the prerender, not a dynamic hole.
 */
export async function TrendingUsersStrip(): Promise<ReactNode> {
  "use cache";
  cacheLife("hours");

  const rows = await trendingUsers();

  if (rows.length === 0) {
    return null;
  }

  return (
    <Section>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 4, alignItems: { sm: "flex-end" }, justifyContent: "space-between" }}
      >
        <Stack spacing={1}>
          <SectionEyebrow>ON THE HUNT</SectionEyebrow>
          <Typography variant="h2">People trending on JobPilot.</Typography>
          <Typography variant="body2Muted">
            Ranked by applications sent and networking outreach this month.
          </Typography>
        </Stack>
        <LinkButton href="/leaderboard" variant="outlined">
          View leaderboard
        </LinkButton>
      </Stack>
      <Grid container spacing={2}>
        {rows.map((row) => (
          <Grid key={row.username} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <PortfolioAvatar name={row.displayName} size={44} />
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <MuiLink href={`/u/${row.username}`} sx={{ fontWeight: 600 }}>
                      {row.displayName}
                    </MuiLink>
                    {row.headline && (
                      <Typography variant="captionMuted" noWrap>
                        {row.headline}
                      </Typography>
                    )}
                    <Typography variant="captionMuted">{row.activityCount} activities</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}

async function trendingUsers(): Promise<LeaderboardRow[]> {
  try {
    const { data, error } = await api.public.portfolio.leaderboard.get({
      query: { window: "month" },
    });
    if (error) {
      console.error("trending users strip: leaderboard unavailable", error.value);
      return [];
    }
    return (data?.rows ?? []).slice(0, SHOWN);
  } catch (error) {
    console.error("trending users strip: leaderboard unreachable", error);
    return [];
  }
}
