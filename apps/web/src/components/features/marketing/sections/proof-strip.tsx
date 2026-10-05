import type { ReactElement } from "react";
import { Box, Container, Grid, Stack, Typography } from "@mui/material";
import { cacheLife } from "next/cache";
import { api } from "@/api/client";

const BOARDS = [
  "LinkedIn",
  "Indeed",
  "Hiring Cafe",
  "We Work Remotely",
  "Wellfound",
  "Y Combinator",
  "Welcome to the Jungle",
  "HN Who's Hiring",
  "Remote OK",
  "4 Day Week",
  "Upwork",
];

const numberFormat = new Intl.NumberFormat("en-US");

interface Stat {
  value: string;
  label: string;
}

/**
 * Live totals over the board list. A failed fetch drops only the numbers it would have filled -
 * a decorative strip must never 500 the landing page. Cached so it renders inside the prerender.
 */
export async function ProofStrip(): Promise<ReactElement> {
  "use cache";
  cacheLife("hours");

  const stats = await loadStats();

  return (
    <Box
      component="section"
      aria-label="JobPilot in numbers"
      sx={{ borderBlock: 1, borderColor: "line.divider", backgroundColor: "surfaces.card" }}
    >
      <Container maxWidth="lg" sx={{ paddingBlock: { xs: 4, md: 5 } }}>
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Grid container spacing={3} sx={{ justifyContent: "center" }}>
            {stats.map((stat) => (
              <Grid key={stat.label} size={{ xs: 6, md: 3 }} sx={{ textAlign: "center" }}>
                <Typography variant="statValue" component="p">
                  {stat.value}
                </Typography>
                <Typography variant="statLabel" component="p" sx={{ mt: 1 }}>
                  {stat.label}
                </Typography>
              </Grid>
            ))}
          </Grid>
          <Box
            component="ul"
            sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1, m: 0, p: 0 }}
          >
            {BOARDS.map((board) => (
              <Typography key={board} component="li" variant="monoChip" sx={{ listStyle: "none" }}>
                {board}
              </Typography>
            ))}
            <Typography
              component="li"
              variant="monoChip"
              sx={{ listStyle: "none", color: "primary.main", borderStyle: "dashed" }}
            >
              + any site you add
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

async function loadStats(): Promise<Stat[]> {
  const boards: Stat = { value: String(BOARDS.length), label: "Job boards built in" };
  const [jobs, community] = await Promise.all([
    api.public.jobs.get({ query: { page: 1, limit: 1 } }).catch(() => null),
    api.public.portfolio.community.get().catch(() => null),
  ]);

  const stats: Stat[] = [];
  const jobTotal = jobs?.data?.pagination.total;
  if (jobTotal) {
    stats.push({ value: numberFormat.format(jobTotal), label: "Jobs found by agents" });
  }
  const applications = community?.data?.applications;
  if (applications) {
    stats.push({ value: numberFormat.format(applications), label: "Applications this month" });
  }
  stats.push(boards);
  const activeUsers = community?.data?.activeUsers;
  if (activeUsers) {
    stats.push({ value: numberFormat.format(activeUsers), label: "People applying this month" });
  }
  return stats;
}
