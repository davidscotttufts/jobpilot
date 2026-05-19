"use client";

import type { ReactElement } from "react";
import { Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { SectionCard } from "@/components/ui/layout";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { runChannel } from "@/lib/sse/channels/run";
import { useSseChannel } from "@/lib/sse/client";
import type { RunDetailDto } from "@/types/api";
import { formatRelativeTime } from "@/utils/format";
import { RunActionsBar } from "./run-actions-bar";
import { RunJobsTable } from "./run-jobs-table";
import { RunSummaryTiles } from "./run-summary-tiles";
import { RUN_STATUS_COLOR, RUN_STATUS_LABEL } from "./run-ui";

interface RunLiveViewerProps {
  runId: string;
}

export function RunLiveViewer(props: RunLiveViewerProps): ReactElement {
  const { runId } = props;
  const queryClient = useQueryClient();

  const detail = useApiQuery<RunDetailDto>(queryKeys.runs.detail(runId), () =>
    apiClient.get<RunDetailDto>(`/api/runs/${encodeURIComponent(runId)}`),
  );

  useSseChannel(runChannel, { runId }, {
    onMessage: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.detail(runId) });
    },
  });

  if (detail.isLoading || !detail.data) {
    return <LinearProgress />;
  }

  const run = detail.data;
  const cfg = run.config;
  const isAutopilot = run.source === "autopilot";

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
        >
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
          {isAutopilot && typeof cfg.minScore === "number" && (
            <Chip size="small" label={`Min score: ${cfg.minScore}`} variant="outlined" />
          )}
          {isAutopilot && (
            <Chip
              size="small"
              label={`Max apps: ${cfg.maxApplications ?? "∞"}`}
              variant="outlined"
            />
          )}
        </Stack>
        <RunActionsBar run={run} />
      </Stack>
      {run.status === "paused" && (
        <Typography variant="body2Muted">Paused — click Resume to continue.</Typography>
      )}
      <RunSummaryTiles run={run} />
      <SectionCard title="Jobs" description="Updated live as the run progresses.">
        <RunJobsTable rows={run.jobs} />
      </SectionCard>
    </Stack>
  );
}
