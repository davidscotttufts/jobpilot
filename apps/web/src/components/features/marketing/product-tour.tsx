import type { ReactElement } from "react";
import { Container, Grid, Stack, Typography } from "@mui/material";
import { fontFamilies } from "@/theme";
import { InboxPanel, PipelinePanel, ResumePanel, UpworkPanel } from "./mock-panels";

interface TourRow {
  eyebrow: string;
  title: string;
  body: string;
  panel: ReactElement;
}

const ROWS: TourRow[] = [
  {
    eyebrow: "PIPELINE",
    title: "Every application, one funnel.",
    body: "Nine stages from applied to offer, in a funnel you never fill in by hand. The agent reports each application as it lands, and analytics sit on top.",
    panel: <PipelinePanel />,
  },
  {
    eyebrow: "INBOX",
    title: "Replies land sorted.",
    body: "JobPilot reads recruiter replies from your Gmail, classifies them, and matches each to an application. You approve the stage move - nothing changes without you.",
    panel: <InboxPanel />,
  },
  {
    eyebrow: "RESUME STUDIO",
    title: "One resume, tailored per job.",
    body: "Keep a base resume; the agent creates a tailored variant per application, rendered to PDF live. You always know which version went where.",
    panel: <ResumePanel />,
  },
  {
    eyebrow: "UPWORK",
    title: "Freelance without the lottery.",
    body: "Client-quality filters drop low hire rates and empty spend histories before ranking what's left. Proposals and profile improvements are drafted for your approval.",
    panel: <UpworkPanel />,
  },
];

export function ProductTour(): ReactElement {
  return (
    <Container maxWidth="lg" sx={{ paddingBlock: { xs: 6, md: 9 } }}>
      <Stack spacing={{ xs: 8, md: 12 }}>
        {ROWS.map((row, i) => (
          <Grid
            key={row.eyebrow}
            container
            spacing={{ xs: 3, md: 8 }}
            direction={i % 2 ? "row-reverse" : "row"}
            sx={{ alignItems: "center" }}
          >
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1.5}>
                <Typography
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontSize: "0.75rem",
                    letterSpacing: "0.18em",
                    color: "accent.primary",
                  }}
                >
                  {row.eyebrow}
                </Typography>
                <Typography variant="h2">{row.title}</Typography>
                <Typography variant="body1Muted" sx={{ fontSize: "0.9375rem", maxWidth: 440 }}>
                  {row.body}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>{row.panel}</Grid>
          </Grid>
        ))}
      </Stack>
    </Container>
  );
}
