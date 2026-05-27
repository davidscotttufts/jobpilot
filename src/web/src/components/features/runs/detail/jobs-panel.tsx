"use client";

import { useState, type ReactElement } from "react";
import { Autorenew, Clear, Replay } from "@mui/icons-material";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import { useQueryClient } from "@tanstack/react-query";
import { SelectField, type SelectFieldOption } from "@/components/ui/form";
import { SectionCard } from "@/components/ui/layout";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { RUN_JOB_STATUSES, type RunJobStatus } from "@/lib/schemas/run";
import { useAgent } from "@/providers/agent-provider";
import { useToast } from "@/providers/notification-provider";
import type { RunDetailDto, RunJobDto } from "@/types/api";
import { isReapplicable, RunJobsTable } from "./jobs-table";

const STATUS_OPTIONS: ReadonlyArray<SelectFieldOption<RunJobStatus>> = RUN_JOB_STATUSES.map(
  (s) => ({
    value: s,
    label: s,
  }),
);

const EMPTY_SELECTION: GridRowSelectionModel = { type: "include", ids: new Set() };

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Selected, re-applicable jobs — resolved across all pages, not just the visible filter. */
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

/** Jobs table with status/search filtering and bulk re-apply / rescan of selected jobs. */
export function RunJobsPanel(props: RunJobsPanelProps): ReactElement {
  const { run, onApplyJob } = props;
  const agent = useAgent();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<RunJobStatus | null>(null);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION);

  const term = search.trim().toLowerCase();
  const visible = run.jobs.filter(
    (j) =>
      (!statusFilter || j.status === statusFilter) &&
      (!term || `${j.title} ${j.company}`.toLowerCase().includes(term)),
  );

  const canReapply = run.status !== "in_progress";
  const selected = canReapply ? resolveSelected(selection, run.jobs, visible) : [];
  const selectedSkipped = selected.filter((j) => j.status === "skipped");
  const hasFilters = statusFilter !== null || term !== "";

  const resetSelection = (): void => {
    setSelection(EMPTY_SELECTION);
    queryClient.invalidateQueries({ queryKey: queryKeys.runs.detail(run.runId) });
  };

  const reapply = useApiMutation<number, void>(
    async () => {
      const results = await Promise.all(
        selected.map((job) =>
          apiClient.patch<RunJobDto>(
            `/api/runs/${encodeURIComponent(run.runId)}/jobs/${encodeURIComponent(job.key)}`,
            { status: "approved" },
          ),
        ),
      );
      const failure = results.find((r) => r.error);
      return failure?.error
        ? { data: null, error: failure.error }
        : { data: selected.length, error: null };
    },
    {
      invalidate: [queryKeys.runs.detail(run.runId)],
      successMessage: (n) => `Re-applying ${plural(n, "job")}`,
      onSuccess: () => {
        void agent.injectSkill("apply", `run ${run.runId}`);
        setSelection(EMPTY_SELECTION);
      },
    },
  );

  const rescanSelected = (): void => {
    const keys = selectedSkipped.map((j) => j.key).join(",");
    void agent.injectSkill("rescan-skipped", `${run.runId} --jobs ${keys}`);
    toast.success(`Rescanning ${plural(selectedSkipped.length, "skipped job")}`);
    resetSelection();
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
        {canReapply && selectedSkipped.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<Autorenew fontSize="sm" />}
            onClick={rescanSelected}
          >
            Rescan selected ({selectedSkipped.length})
          </Button>
        )}
        {canReapply && selected.length > 0 && (
          <Button
            variant="contained"
            startIcon={<Replay fontSize="sm" />}
            disabled={reapply.isPending}
            onClick={() => reapply.mutate()}
          >
            Re-apply selected ({selected.length})
          </Button>
        )}
        <Typography variant="captionMuted">{plural(visible.length, "job")}</Typography>
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
