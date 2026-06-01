"use client";

import type { ReactElement } from "react";
import { LinearProgress, Stack } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/client/api";
import { queryKeys } from "@/lib/client/query-keys";
import { runChannel } from "@/lib/sse/channels/run";
import { useSseChannel } from "@/lib/sse/client";
import { useAgent } from "@/providers/agent-provider";
import type { RunDetailDto, RunJobDto } from "@/types/api";
import { OutreachBoard } from "@/components/features/outreach";
import { RunHeaderCard } from "./detail/header-card";
import { RunJobsPanel } from "./detail/jobs-panel";
import { RunReasonBreakdown } from "./detail/reason-breakdown";
import { RunSummaryTiles } from "./detail/summary-tiles";

interface RunDetailProps {
  runId: string;
}

export function RunDetail(props: RunDetailProps): ReactElement {
  const { runId } = props;
  const queryClient = useQueryClient();
  const agent = useAgent();

  const detail = useApiQuery<RunDetailDto>(queryKeys.runs.detail(runId), () =>
    apiClient.get<RunDetailDto>(`/api/runs/${encodeURIComponent(runId)}`),
  );

  useSseChannel(
    runChannel,
    { runId },
    {
      onMessage: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.runs.detail(runId) });
      },
    },
  );

  if (detail.isLoading || !detail.data) {
    return <LinearProgress />;
  }

  const run = detail.data;
  const isAutoApply = run.source === "auto-apply";

  if (run.source === "outreach") {
    return (
      <Stack spacing={3}>
        <RunHeaderCard run={run} />
        <OutreachBoard runId={runId} summary={run.summary} config={run.config.outreach} />
      </Stack>
    );
  }

  // Auto-apply runs apply on their own; on other runs (e.g. search results) the
  // user dispatches a job to the single-job apply flow by its URL.
  const applyJob = (job: RunJobDto): void => {
    if (!isAutoApply) {
      return;
    }
    void agent.injectSkill("apply", job.url);
  };

  return (
    <Stack spacing={3}>
      <RunHeaderCard run={run} />
      <RunSummaryTiles run={run} />
      <RunReasonBreakdown run={run} />
      <RunJobsPanel run={run} onApplyJob={applyJob} />
    </Stack>
  );
}
