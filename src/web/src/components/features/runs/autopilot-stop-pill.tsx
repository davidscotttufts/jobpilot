"use client";

import type { ReactElement } from "react";
import { Stop } from "@mui/icons-material";
import { Button, Paper, Stack, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { RunSource, RunStatus } from "@/lib/schemas/run";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { useSseChannel } from "@/lib/sse/client";
import type { RunDto } from "@/types/api";

const FILTERS = {
  status: "in_progress" satisfies RunStatus,
  source: "autopilot" satisfies RunSource,
} as const;

const RUNS_URL = `/api/runs?status=${FILTERS.status}&source=${FILTERS.source}`;

export function AutopilotStopPill(): ReactElement {
  const queryClient = useQueryClient();

  const invalidateRuns = (): void => {
    queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
  };
  useSseChannel(pipelineChannel, null, {
    on: {
      "run.updated": invalidateRuns,
      "run.completed": invalidateRuns,
    },
  });

  const runs = useApiQuery<RunDto[]>(queryKeys.runs.list(FILTERS), () =>
    apiClient.get<RunDto[]>(RUNS_URL),
  );

  const active = runs.data?.[0] ?? null;

  const stop = useApiMutation<{ runId: string; status: string }, void>(
    () => {
      if (!active) {
        return Promise.resolve({
          data: null,
          error: { code: "NO_RUN", message: "No active autopilot run" },
        });
      }
      return apiClient.patch<{ runId: string; status: RunStatus }>(
        `/api/runs/${encodeURIComponent(active.runId)}`,
        { status: "paused" satisfies RunStatus },
      );
    },
    {
      successMessage: "Autopilot paused",
      invalidate: [queryKeys.runs.all, queryKeys.pipeline.all],
    },
  );

  if (!active) {
    return <></>;
  }

  return (
    <Paper
      elevation={8}
      sx={(t) => ({
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: t.zIndex.snackbar,
        borderRadius: t.radii.md,
        padding: 1.5,
        backgroundColor: t.palette.background.paper,
        border: `1px solid ${t.palette.line.divider}`,
      })}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Stack spacing={0}>
          <Typography variant="captionMuted">Autopilot running</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 240 }} noWrap>
            {active.query}
          </Typography>
        </Stack>
        <Button
          size="small"
          variant="contained"
          color="warning"
          startIcon={<Stop fontSize="sm" />}
          onClick={() => stop.mutate()}
          disabled={stop.isPending}
        >
          Stop
        </Button>
      </Stack>
    </Paper>
  );
}
