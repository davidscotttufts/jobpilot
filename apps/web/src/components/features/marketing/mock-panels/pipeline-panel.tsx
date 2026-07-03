"use client";

import type { ReactElement } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { fontFamilies } from "@/theme";
import { PanelBadge, panelCellSx, PanelFrame } from "./panel-frame";

// Mirrors the real pipeline page: funnel-group cards on top, applications beneath.
const FUNNEL = [
  { label: "Applied", count: 47, dot: "stages.applying" },
  { label: "Screening", count: 4, dot: "warning.main" },
  { label: "Interview", count: 2, dot: "accent.primary" },
  { label: "Offer", count: 2, dot: "stages.submitted" },
];

const APPLICATIONS = [
  {
    company: "Stripe",
    role: "Senior Frontend Engineer",
    stage: "Applied",
    tone: "stages.applying",
  },
  { company: "Vercel", role: "Design Engineer", stage: "Interview", tone: "accent.primary" },
  {
    company: "Supabase",
    role: "Senior TypeScript Engineer",
    stage: "Offer",
    tone: "stages.submitted",
  },
];

export function PipelinePanel(): ReactElement {
  return (
    <PanelFrame label="pipeline">
      <Stack spacing={1.5}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
          {FUNNEL.map((group) => (
            <Box key={group.label} sx={[panelCellSx, { padding: 1 }]}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <Box
                  sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: group.dot }}
                />
                <Typography variant="statLabel" noWrap>
                  {group.label}
                </Typography>
              </Stack>
              <Typography variant="statValue" sx={{ fontSize: "1.125rem", mt: 0.5 }}>
                {group.count}
              </Typography>
            </Box>
          ))}
        </Box>
        <Stack spacing={1}>
          {APPLICATIONS.map((app) => (
            <Box
              key={app.company}
              sx={[
                panelCellSx,
                {
                  padding: 1.25,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                },
              ]}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }} noWrap>
                  {app.company}
                </Typography>
                <Typography variant="captionMuted" noWrap sx={{ display: "block" }}>
                  {app.role}
                </Typography>
              </Box>
              <PanelBadge color={app.tone}>{app.stage}</PanelBadge>
            </Box>
          ))}
        </Stack>
        <Typography
          sx={{ fontFamily: fontFamilies.mono, fontSize: "0.6875rem", color: "text.disabled" }}
        >
          9 stages · applied → offer
        </Typography>
      </Stack>
    </PanelFrame>
  );
}
