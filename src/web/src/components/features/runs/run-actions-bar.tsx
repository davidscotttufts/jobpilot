"use client";

import type { ReactElement } from "react";
import { Pause, PlayArrow, Replay } from "@mui/icons-material";
import { Button, Stack } from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { RunStatus } from "@/lib/schemas/run";
import { useAgent } from "@/providers/agent-provider";
import type { RunDetailDto } from "@/types/api";

interface RunActionsBarProps {
  run: RunDetailDto;
}

export function RunActionsBar(props: RunActionsBarProps): ReactElement {
  const { run } = props;
  const agent = useAgent();

  const stop = useApiMutation<{ runId: string; status: RunStatus }, void>(
    () =>
      apiClient.patch<{ runId: string; status: RunStatus }>(
        `/api/runs/${encodeURIComponent(run.runId)}`,
        { status: "paused" satisfies RunStatus },
      ),
    {
      successMessage: "Run paused",
      invalidate: [queryKeys.runs.all, queryKeys.pipeline.all],
    },
  );

  const failedCount = run.jobs.filter((j) => j.status === "failed").length;
  const isInProgress = run.status === "in_progress";
  const isPaused = run.status === "paused";
  const isInterrupted = run.status === "interrupted";

  return (
    <Stack direction="row" spacing={1}>
      {isInProgress && (
        <Button
          variant="outlined"
          color="warning"
          startIcon={<Pause fontSize="sm" />}
          onClick={() => stop.mutate()}
          disabled={stop.isPending}
        >
          Stop
        </Button>
      )}
      {(isPaused || isInterrupted) && (
        <Button
          variant="contained"
          startIcon={<PlayArrow fontSize="sm" />}
          onClick={() => {
            void agent.injectSkill("resume", run.runId);
          }}
        >
          Resume
        </Button>
      )}
      {failedCount > 0 && run.source === "auto-apply" && (
        <Button
          variant="outlined"
          startIcon={<Replay fontSize="sm" />}
          onClick={() => {
            void agent.injectSkill("auto-apply", `retry-failed ${run.runId}`);
          }}
        >
          Retry failed ({failedCount})
        </Button>
      )}
    </Stack>
  );
}
