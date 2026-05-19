"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { ChevronRight, Clear } from "@mui/icons-material";
import { Alert, Box, Button, Chip, Pagination, Stack, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { SelectField, type SelectFieldOption } from "@/components/ui/form";
import { SectionCard } from "@/components/ui/layout";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { RUN_SOURCES, type RunSource, type RunStatus } from "@/lib/schemas/run";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { useSseChannel } from "@/lib/sse/client";
import type { RunDto } from "@/types/api";
import { formatRelativeTime } from "@/utils/format";
import { RUN_STATUS_COLOR, RUN_STATUS_LABEL, RUN_STATUS_OPTIONS } from "./run-ui";

const PAGE_SIZE = 12;

const SOURCE_OPTIONS: ReadonlyArray<SelectFieldOption<RunSource>> = RUN_SOURCES.map((s) => ({
  value: s,
  label: s,
}));

export function RunsList(): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<RunStatus | null>(null);
  const [sourceFilter, setSourceFilter] = useState<RunSource | null>(null);
  const [page, setPage] = useState(1);

  const invalidateRuns = (): void => {
    queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
  };
  useSseChannel(pipelineChannel, null, {
    on: {
      "run.updated": invalidateRuns,
      "run.completed": invalidateRuns,
    },
  });

  const runs = useApiQuery<RunDto[]>(queryKeys.runs.list(), () =>
    apiClient.get<RunDto[]>("/api/runs"),
  );

  const allRows = runs.data ?? [];
  const interruptedCount = allRows.filter((r) => r.status === "interrupted").length;

  const filteredRows = allRows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) {
      return false;
    }
    if (sourceFilter && r.source !== sourceFilter) {
      return false;
    }
    return true;
  });

  const hasFilters = statusFilter !== null || sourceFilter !== null;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleResetFilters = (): void => {
    setStatusFilter(null);
    setSourceFilter(null);
    setPage(1);
  };

  const handleNavigate = (runId: string): void => {
    router.push(`/runs/${encodeURIComponent(runId)}` as Route);
  };

  return (
    <SectionCard>
      {interruptedCount > 0 && (
        <Alert
          severity="warning"
          variant="outlined"
          sx={{ mb: 2, cursor: statusFilter === "interrupted" ? "default" : "pointer" }}
          onClick={() => {
            if (statusFilter !== "interrupted") {
              setStatusFilter("interrupted");
              setPage(1);
            }
          }}
        >
          {interruptedCount} {interruptedCount === 1 ? "run was" : "runs were"} interrupted. Open
          one and click Resume to continue.
        </Alert>
      )}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ alignItems: { xs: "stretch", md: "center" }, mb: 2 }}
      >
        <SelectField
          label="Status"
          value={statusFilter}
          options={RUN_STATUS_OPTIONS}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        />
        <SelectField
          label="Source"
          value={sourceFilter}
          options={SOURCE_OPTIONS}
          onChange={(v) => {
            setSourceFilter(v);
            setPage(1);
          }}
        />
        {hasFilters && (
          <Button
            size="small"
            variant="text"
            startIcon={<Clear fontSize="sm" />}
            onClick={handleResetFilters}
          >
            Clear
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography variant="captionMuted">
          {filteredRows.length} {filteredRows.length === 1 ? "run" : "runs"}
        </Typography>
      </Stack>

      {allRows.length === 0 ? (
        <EmptyMessage>No runs yet. Start one from "New run".</EmptyMessage>
      ) : filteredRows.length === 0 ? (
        <EmptyMessage>No runs match the current filters.</EmptyMessage>
      ) : (
        <Stack spacing={1}>
          {pageRows.map((r) => (
            <Stack
              key={r.runId}
              direction="row"
              spacing={2}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/runs/${encodeURIComponent(r.runId)}` as Route)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNavigate(r.runId);
                }
              }}
              sx={(t) => ({
                alignItems: "center",
                p: 1.5,
                borderRadius: t.radii.sm,
                border: `1px solid ${t.palette.line.divider}`,
                cursor: "pointer",
                "&:hover": { backgroundColor: t.palette.action.hover },
              })}
            >
              <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    label={RUN_STATUS_LABEL[r.status]}
                    color={RUN_STATUS_COLOR[r.status]}
                    variant="outlined"
                  />
                  <Chip size="small" label={r.source} variant="outlined" />
                  {r.config.board && (
                    <Chip size="small" label={r.config.board} variant="outlined" />
                  )}
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {r.query}
                </Typography>
                <Typography variant="captionMuted">
                  Started {formatRelativeTime(r.startedAt)} · Applied {r.summary.applied} · Failed{" "}
                  {r.summary.failed} · Skipped {r.summary.skipped}
                </Typography>
              </Stack>
              <ChevronRight fontSize="md" />
            </Stack>
          ))}
        </Stack>
      )}

      {filteredRows.length > PAGE_SIZE && (
        <Stack
          direction="row"
          sx={{ mt: 2, alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography variant="captionMuted">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </Typography>
          <Pagination
            size="small"
            count={pageCount}
            page={safePage}
            onChange={(_, p) => setPage(p)}
          />
        </Stack>
      )}
    </SectionCard>
  );
}

function EmptyMessage({ children }: { children: ReactNode }): ReactElement {
  return (
    <Box sx={{ py: 3, textAlign: "center" }}>
      <Typography variant="body2Muted">{children}</Typography>
    </Box>
  );
}
