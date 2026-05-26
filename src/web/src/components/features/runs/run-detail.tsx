"use client";

import type { ReactElement } from "react";
import { Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { runChannel } from "@/lib/sse/channels/run";
import { useSseChannel } from "@/lib/sse/client";
import { useAgent } from "@/providers/agent-provider";
import type { RunDetailDto, RunJobDto } from "@/types/api";
import { formatRelativeTime } from "@/utils/format";
import { RunActionsBar } from "./detail/actions-bar";
import { RunIdentityBanner } from "./detail/identity-banner";
import { RunJobsPanel } from "./detail/jobs-panel";
import { RunReasonBreakdown } from "./detail/reason-breakdown";
import { RunSummaryTiles } from "./detail/summary-tiles";
import { RUN_STATUS_COLOR, RUN_STATUS_LABEL } from "./run-status";

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
  const cfg = run.config;
  const isAutoApply = run.source === "auto-apply";

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
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Chip
            size="small"
            label={RUN_STATUS_LABEL[run.status]}
            color={RUN_STATUS_COLOR[run.status]}
            variant="outlined"
          />
          <Typography variant="body2Muted">
            {run.source} · Started {formatRelativeTime(run.startedAt)} ago
          </Typography>
          {cfg.board && <Chip size="small" label={`Board: ${cfg.board}`} variant="outlined" />}
          {!isAutoApply && typeof cfg.maxJobs === "number" && (
            <Chip size="small" label={`Jobs: ${cfg.maxJobs}`} variant="outlined" />
          )}
          {isAutoApply && typeof cfg.minScore === "number" && (
            <Chip size="small" label={`Min score: ${cfg.minScore}`} variant="outlined" />
          )}
          {isAutoApply && (
            <Chip
              size="small"
              label={`Max apps: ${cfg.maxApplications ?? "∞"}`}
              variant="outlined"
            />
          )}
        </Stack>
        <RunActionsBar run={run} />
      </Stack>
      <RunIdentityBanner />
      {run.status === "paused" && (
        <Typography variant="body2Muted">Paused — click Resume to continue.</Typography>
      )}
      <RunSummaryTiles run={run} />
      <RunReasonBreakdown run={run} />
      <RunJobsPanel run={run} onApplyJob={applyJob} />
    </Stack>
  );
}
