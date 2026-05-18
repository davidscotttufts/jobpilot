"use client";

import type { ReactElement } from "react";
import { Button, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import type { PipelineStage } from "@/types/api";
import { usePipelineActions } from "../actions-provider";

interface ColumnEmptyStateProps {
  stage: PipelineStage;
}

export function ColumnEmptyState(props: ColumnEmptyStateProps): ReactElement {
  const { stage } = props;
  const actions = usePipelineActions();

  return (
    <Stack
      spacing={1.5}
      sx={(theme) => ({
        alignItems: "center",
        justifyContent: "center",
        minHeight: 160,
        padding: 2,
        color: theme.palette.text.disabled,
        textAlign: "center",
      })}
    >
      {stage === "queued" && (
        <>
          <Typography variant="captionMuted">Nothing queued.</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={actions.openAddUrls}>
              Add URLs
            </Button>
            <Button size="small" variant="contained" onClick={actions.openAutopilot}>
              Autopilot…
            </Button>
          </Stack>
        </>
      )}
      {stage === "applying" && (
        <Typography variant="captionMuted">
          No active run. Use <strong>Run ▾</strong> above to start.
        </Typography>
      )}
      {stage === "submitted" && (
        <>
          <Typography variant="captionMuted">Submitted applications will appear here.</Typography>
          <Button size="small" variant="text" component={Link} href={"/runs" as Route}>
            View recent runs →
          </Button>
        </>
      )}
      {stage === "interviewing" && (
        <Typography variant="captionMuted">
          Advance an application from its detail page to land it here.
        </Typography>
      )}
    </Stack>
  );
}
