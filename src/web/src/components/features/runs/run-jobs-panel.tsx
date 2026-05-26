"use client";

import { useState, type ReactElement } from "react";
import { Clear, Replay } from "@mui/icons-material";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import { useQueryClient } from "@tanstack/react-query";
import { SelectField, type SelectFieldOption } from "@/components/ui/form";
import { SectionCard } from "@/components/ui/layout";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { RUN_JOB_STATUSES, type RunJobStatus } from "@/lib/schemas/run";
import { useAgent } from "@/providers/agent-provider";
import { useToast } from "@/providers/notification-provider";
import type { RunDetailDto, RunJobDto } from "@/types/api";
import { isReapplicable, RunJobsTable } from "./run-jobs-table";

const STATUS_OPTIONS: ReadonlyArray<SelectFieldOption<RunJobStatus>> = RUN_JOB_STATUSES.map(
  (s) => ({
    value: s,
    label: s,
  }),
);

const EMPTY_SELECTION: GridRowSelectionModel = { type: "include", ids: new Set() };

function resolveSelected(
  model: GridRowSelectionModel,
  allJobs: ReadonlyArray<RunJobDto>,
  visible: ReadonlyArray<RunJobDto>,
): RunJobDto[] {
  const matched =
    model.type === "include"
      ? allJobs.filter((j) => model.ids.has(j.id))
      : visible.filter((j) => !model.ids.has(j.id));
  return matched.filter((j) => isReapplicable(j.status));
}

interface RunJobsPanelProps {
  run: RunDetailDto;
  /** Per-job single Apply action (auto-apply runs). */
  onApplyJob?: (job: RunJobDto) => void;
}

/** Jobs table with status/search filtering and bulk re-apply of selected jobs. */
export function RunJobsPanel(props: RunJobsPanelProps): ReactElement {
  const { run, onApplyJob } = props;
  const agent = useAgent();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<RunJobStatus | null>(null);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION);
  const [reapplying, setReapplying] = useState(false);

  const term = search.trim().toLowerCase();
  const visible = run.jobs.filter((j) => {
    if (statusFilter && j.status !== statusFilter) {
      return false;
    }
    if (term && !`${j.title} ${j.company}`.toLowerCase().includes(term)) {
      return false;
    }
    return true;
  });

  const canReapply = run.status !== "in_progress";
  const selectedTargets = canReapply ? resolveSelected(selection, run.jobs, visible) : [];
  const hasFilters = statusFilter !== null || term !== "";

  const handleReapply = async (): Promise<void> => {
    if (selectedTargets.length === 0) {
      return;
    }
    setReapplying(true);
    const results = await Promise.all(
      selectedTargets.map((job) =>
        apiClient.patch<RunJobDto>(
          `/api/runs/${encodeURIComponent(run.runId)}/jobs/${encodeURIComponent(job.jobKey)}`,
          { status: "approved" },
        ),
      ),
    );
    setReapplying(false);

    const failure = results.find((r) => r.error);
    if (failure?.error) {
      toast.error(failure.error.message);
      return;
    }

    void agent.injectSkill("apply", `run ${run.runId}`);
    toast.success(
      `Re-applying ${selectedTargets.length} job${selectedTargets.length === 1 ? "" : "s"}`,
    );
    setSelection(EMPTY_SELECTION);
    queryClient.invalidateQueries({ queryKey: queryKeys.runs.detail(run.runId) });
  };

  return (
    <SectionCard title="Jobs" description="Updated live as the run progresses.">
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ alignItems: { xs: "stretch", md: "center" }, mb: 2 }}
      >
        <SelectField
          label="Status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
        />
        <TextField
          size="small"
          label="Search title / company"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        {hasFilters && (
          <Button
            size="small"
            variant="text"
            startIcon={<Clear fontSize="sm" />}
            onClick={() => {
              setStatusFilter(null);
              setSearch("");
            }}
          >
            Clear
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {canReapply && selectedTargets.length > 0 && (
          <Button
            variant="contained"
            startIcon={<Replay fontSize="sm" />}
            disabled={reapplying}
            onClick={() => void handleReapply()}
          >
            Re-apply selected ({selectedTargets.length})
          </Button>
        )}
        <Typography variant="captionMuted">
          {visible.length} {visible.length === 1 ? "job" : "jobs"}
        </Typography>
      </Stack>
      <RunJobsTable
        rows={visible}
        onApplyJob={onApplyJob}
        checkboxSelection={canReapply}
        rowSelectionModel={selection}
        onRowSelectionModelChange={setSelection}
      />
    </SectionCard>
  );
}
