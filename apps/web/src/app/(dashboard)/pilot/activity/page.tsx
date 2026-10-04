import type { ReactElement } from "react";
import { Grid } from "@mui/material";
import type { Metadata } from "next";
import { CycleCost, JournalFeed } from "@/components/features/pilot";

export const metadata: Metadata = { title: "Activity" };

export default function PilotActivityPage(): ReactElement {
  return (
    <Grid container spacing={3} sx={{ alignItems: "flex-start" }}>
      {/* Sticky on desktop so the breakdown stays beside a journal that keeps loading. */}
      <Grid
        size={{ xs: 12, md: 4 }}
        sx={{
          order: { md: 2 },
          position: { md: "sticky" },
          // theme.spacing(3) as a string: a server page can't pass an sx callback.
          top: { md: "calc(3 * var(--mui-spacing))" },
        }}
      >
        <CycleCost />
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <JournalFeed />
      </Grid>
    </Grid>
  );
}
