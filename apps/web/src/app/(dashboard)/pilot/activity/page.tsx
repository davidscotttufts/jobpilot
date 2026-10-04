import type { ReactElement } from "react";
import { Box, Grid } from "@mui/material";
import type { Metadata } from "next";
import { CycleCost, JournalFeed } from "@/components/features/pilot";

export const metadata: Metadata = { title: "Activity" };

export default function PilotActivityPage(): ReactElement {
  return (
    <Grid container spacing={3} sx={{ alignItems: "flex-start" }}>
      <Grid size={{ xs: 12, md: 4 }} sx={{ order: { md: 2 } }}>
        {/* Sticky on desktop so the breakdown stays beside a journal that keeps loading. */}
        <Box sx={{ position: { md: "sticky" }, top: { md: 16 } }}>
          <CycleCost />
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <JournalFeed />
      </Grid>
    </Grid>
  );
}
