"use client";

import type { ReactElement } from "react";
import { PlayArrow } from "@mui/icons-material";
import { Box, Button, Tooltip } from "@mui/material";
import { isRunPending, runDisabledReason, useJobAlerts } from "./use-job-alerts";

export function RunJobAlertsButton(): ReactElement {
  const { status, run } = useJobAlerts();

  const disabledReason = status ? runDisabledReason(status) : null;
  const active = isRunPending(status);
  const hint = disabledReason ?? (active ? "An import is already queued or running." : "");

  return (
    // A disabled button emits no pointer events, so the tooltip needs an enabled span to hover over.
    <Tooltip title={hint}>
      <Box component="span" sx={{ display: "inline-flex" }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<PlayArrow />}
          disabled={!status || disabledReason !== null || active || run.isPending}
          onClick={() => run.mutate()}
        >
          Run now
        </Button>
      </Box>
    </Tooltip>
  );
}
