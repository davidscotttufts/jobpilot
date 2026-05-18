import type { ReactElement } from "react";
import { Add } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import {
  OpenAgentButton,
  PipelineFilterBar,
  PipelineHeaderStats,
  PipelineView,
} from "@/components/features/pipeline";

export default function PipelinePage(): ReactElement {
  return (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      <Stack spacing={2} sx={{ paddingInline: 2.5 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "flex-end", justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overlineMuted">Workspace</Typography>
            <Typography
              variant="h1"
              sx={{ fontSize: "1.5rem", mt: 0.5, letterSpacing: "-0.015em" }}
            >
              Pipeline
            </Typography>
            <PipelineHeaderStats />
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button variant="outlined" size="small" startIcon={<Add fontSize="md" />}>
              Add URLs
            </Button>
            <OpenAgentButton />
          </Stack>
        </Stack>

        <PipelineFilterBar />
      </Stack>

      <PipelineView />
    </Stack>
  );
}
