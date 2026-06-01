"use client";

import { useState, type ReactElement } from "react";
import { Autorenew, DoneAll, MoreVert, Pause, PlayArrow, Replay } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { DropdownMenu, type DropdownMenuItem } from "@/components/ui/feedback";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/client/api";
import { queryKeys } from "@/lib/client/query-keys";
import type { RunStatus } from "@/lib/contracts/run";
import { useAgent } from "@/providers/agent-provider";
import { useConfirm } from "@/providers/confirm-provider";
import type { RunDetailDto } from "@/types/api";

interface RunActionsBarProps {
  run: RunDetailDto;
}

export function RunActionsBar(props: RunActionsBarProps): ReactElement {
  const { run } = props;
  const agent = useAgent();
  const confirm = useConfirm();

  const runPath = `/api/runs/${encodeURIComponent(run.runId)}`;

  const stop = useApiMutation<RunDetailDto, void>(
    () => apiClient.patch<RunDetailDto>(runPath, { status: "paused" satisfies RunStatus }),
    { successMessage: "Run paused", invalidate: [queryKeys.runs.all, queryKeys.pipeline.all] },
  );

  const complete = useApiMutation<RunDetailDto, void>(
    () =>
      apiClient.patch<RunDetailDto>(runPath, {
        status: "completed" satisfies RunStatus,
        completedAt: new Date().toISOString(),
      }),
    {
      successMessage: "Run marked as done",
      invalidate: [queryKeys.runs.all, queryKeys.pipeline.all],
    },
  );

  const [rescanOpen, setRescanOpen] = useState(false);
  const [minScore, setMinScore] = useState(run.config.minScore ?? 70);

  const rescan = useApiMutation<RunDetailDto, void>(
    () => apiClient.patch<RunDetailDto>(runPath, { config: { minScore } }),
    { invalidate: [queryKeys.runs.detail(run.runId), queryKeys.runs.all] },
  );

  const failedCount = run.jobs.filter((j) => j.status === "failed").length;
  const skippedCount = run.summary.skipped;
  const isInProgress = run.status === "in_progress";
  const isAutoApply = run.source === "auto-apply";
  const isStopped = run.status === "paused" || run.status === "interrupted";

  const handleMarkDone = async (): Promise<void> => {
    const confirmed = await confirm({
      title: "Mark run as done?",
      description:
        "It stops counting as interrupted and won't be resumable. Use this for runs you stopped on purpose.",
      confirmLabel: "Mark as done",
    });
    if (confirmed) {
      complete.mutate();
    }
  };

  const handleRescanConfirm = async (): Promise<void> => {
    await rescan.mutateAsync();
    void agent.injectSkill("rescan-skipped", run.runId);
    setRescanOpen(false);
  };

  const menuItems: DropdownMenuItem[] = [
    {
      kind: "item",
      key: "done",
      label: "Mark as done",
      icon: <DoneAll fontSize="sm" />,
      show: isStopped,
      disabled: complete.isPending,
      onClick: () => void handleMarkDone(),
    },
    {
      kind: "item",
      key: "retry",
      label: `Retry failed (${failedCount})`,
      icon: <Replay fontSize="sm" />,
      show: isAutoApply && failedCount > 0,
      onClick: () => void agent.injectSkill("auto-apply", `retry-failed ${run.runId}`),
    },
    {
      kind: "item",
      key: "rescan",
      label: `Rescan skipped (${skippedCount})…`,
      icon: <Autorenew fontSize="sm" />,
      show: !isInProgress && skippedCount > 0,
      onClick: () => setRescanOpen(true),
    },
  ];

  const hasMenu = menuItems.some((item) => item.kind === "item" && item.show !== false);

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
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
      {isStopped && (
        <Button
          variant="contained"
          startIcon={<PlayArrow fontSize="sm" />}
          onClick={() => void agent.injectSkill("resume", run.runId)}
        >
          Resume
        </Button>
      )}
      {hasMenu && (
        <DropdownMenu
          items={menuItems}
          trigger={({ onOpen }) => (
            <IconButton onClick={onOpen} aria-label="More run actions">
              <MoreVert fontSize="sm" />
            </IconButton>
          )}
        />
      )}

      <Dialog open={rescanOpen} onClose={() => setRescanOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rescan skipped jobs</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1 }}>
            <Typography variant="body2Muted">
              Re-scores the {skippedCount} skipped {skippedCount === 1 ? "job" : "jobs"} against a
              new threshold and sets eligible ones to <strong>approved</strong> — apply them from the
              jobs list or with Re-apply selected. Lower the threshold to recover jobs dropped just
              below the cutoff.
            </Typography>
            <Typography variant="body2">Min match score: {minScore}</Typography>
            <Slider
              value={minScore}
              min={0}
              max={100}
              step={5}
              marks
              valueLabelDisplay="auto"
              onChange={(_, v) => setMinScore(v as number)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescanOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={rescan.isPending}
            onClick={() => void handleRescanConfirm()}
          >
            Rescan
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
