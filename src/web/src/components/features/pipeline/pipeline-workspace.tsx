"use client";

import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { useSseChannel } from "@/lib/sse/client";
import { PipelineView } from "./pipeline-view";
import { RunsRail } from "./rail/runs-rail";
import { PipelineScopeBanner } from "./rail/scope-banner";

/**
 * Pairs the Runs rail with the stage board and owns the single SSE
 * subscription for the page — invalidating both the pipeline columns and the
 * runs list so the board and the rail stay in sync from one connection.
 */
export function PipelineWorkspace(): ReactElement {
  const queryClient = useQueryClient();

  const invalidateRuns = (): void => {
    queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
  };
  useSseChannel(pipelineChannel, null, {
    onMessage: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all });
    },
    on: {
      "run.updated": invalidateRuns,
      "run.completed": invalidateRuns,
    },
  });

  return (
    <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
      <RunsRail />
      <Stack sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        <PipelineScopeBanner />
        <PipelineView />
      </Stack>
    </Stack>
  );
}
