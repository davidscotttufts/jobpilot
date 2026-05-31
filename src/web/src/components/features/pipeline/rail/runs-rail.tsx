"use client";

import type { ReactElement } from "react";
import { Add, ChevronLeft, Clear, History } from "@mui/icons-material";
import {
  Alert,
  Badge,
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { RunRow, useRunsList } from "@/components/features/runs";
import { RUN_STATUS_OPTIONS } from "@/components/features/runs/run-status";
import { EmptyState, PaginationFooter } from "@/components/ui/data";
import { SelectField, type SelectFieldOption } from "@/components/ui/form";
import { usePersistedBoolean } from "@/hooks/use-persisted-boolean";
import { RUN_SOURCES, type RunSource } from "@/lib/schemas/run";
import type { RunDto } from "@/types/api";
import { usePipelineFilters } from "../hooks/use-pipeline-filters";

const RAIL_EXPANDED = 300;
const RAIL_COLLAPSED = 48;
const RAIL_PAGE_SIZE = 8;
const RAIL_EXPANDED_KEY = "jobpilot.runsRail.expanded";

const SOURCE_OPTIONS: ReadonlyArray<SelectFieldOption<RunSource>> = RUN_SOURCES.map((s) => ({
  value: s,
  label: s,
}));

export function RunsRail(): ReactElement {
  const router = useRouter();
  const { runId, setRunId } = usePipelineFilters();
  const isBelowMd = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const [expanded, setExpanded] = usePersistedBoolean(RAIL_EXPANDED_KEY, !isBelowMd);
  const ctrl = useRunsList(RAIL_PAGE_SIZE);

  const openDetail = (run: RunDto): void => {
    router.push(`/runs/${encodeURIComponent(run.runId)}` as Route);
  };

  if (!expanded) {
    return (
      <Stack
        component="aside"
        aria-label="Runs"
        spacing={1}
        sx={(theme) => ({
          width: RAIL_COLLAPSED,
          flexShrink: 0,
          height: "100%",
          alignItems: "center",
          paddingBlock: 2,
          borderRight: `1px solid ${theme.palette.line.divider}`,
        })}
      >
        <Tooltip title="Show runs" placement="right">
          <IconButton size="small" aria-label="Show runs" onClick={() => setExpanded(true)}>
            <Badge
              color="warning"
              variant="dot"
              invisible={ctrl.interruptedCount === 0}
              overlap="circular"
            >
              <History fontSize="sm" />
            </Badge>
          </IconButton>
        </Tooltip>
        <Typography
          variant="overlineMuted"
          onClick={() => setExpanded(true)}
          sx={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            letterSpacing: "0.1em",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          Runs
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack
      component="aside"
      aria-label="Runs"
      sx={(theme) => ({
        width: RAIL_EXPANDED,
        flexShrink: 0,
        height: "100%",
        minHeight: 0,
        borderRight: `1px solid ${theme.palette.line.divider}`,
      })}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", padding: 1.5, pb: 1 }}
      >
        <Typography variant="overlineMuted">Runs</Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="New run">
            <IconButton size="small" aria-label="New run" onClick={() => router.push("/runs/new")}>
              <Add fontSize="sm" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Hide runs">
            <IconButton size="small" aria-label="Hide runs" onClick={() => setExpanded(false)}>
              <ChevronLeft fontSize="sm" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack spacing={1} sx={{ paddingInline: 1.5 }}>
        {ctrl.interruptedCount > 0 && (
          <Alert
            severity="warning"
            variant="outlined"
            sx={{ cursor: ctrl.statusFilter === "interrupted" ? "default" : "pointer" }}
            onClick={() => {
              if (ctrl.statusFilter !== "interrupted") {
                ctrl.setStatusFilter("interrupted");
              }
            }}
          >
            {ctrl.interruptedCount} {ctrl.interruptedCount === 1 ? "run" : "runs"} interrupted — open
            one and Resume.
          </Alert>
        )}
        <SelectField
          label="Status"
          value={ctrl.statusFilter}
          options={RUN_STATUS_OPTIONS}
          minWidth={0}
          onChange={ctrl.setStatusFilter}
        />
        <SelectField
          label="Source"
          value={ctrl.sourceFilter}
          options={SOURCE_OPTIONS}
          minWidth={0}
          onChange={ctrl.setSourceFilter}
        />
        {ctrl.hasFilters && (
          <Button
            size="small"
            variant="text"
            startIcon={<Clear fontSize="sm" />}
            onClick={ctrl.resetFilters}
            sx={{ alignSelf: "flex-start" }}
          >
            Clear
          </Button>
        )}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 1.5 }}>
        {ctrl.isLoading ? (
          <Typography variant="captionMuted">Loading…</Typography>
        ) : ctrl.allRows.length === 0 ? (
          <EmptyState variant="inline" title="No runs yet" description="Start one from New run." />
        ) : ctrl.filteredRows.length === 0 ? (
          <EmptyState variant="inline" title="No runs match the filters." />
        ) : (
          <Stack spacing={1}>
            {ctrl.pagination.pageRows.map((run) => (
              <RunRow
                key={run.runId}
                run={run}
                selected={run.runId === runId}
                onSelect={(r) => setRunId(r.runId)}
                onOpenDetail={openDetail}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ paddingInline: 1.5 }}>
        <PaginationFooter
          page={ctrl.pagination.page}
          pageCount={ctrl.pagination.pageCount}
          pageSize={RAIL_PAGE_SIZE}
          total={ctrl.pagination.total}
          onChange={ctrl.pagination.setPage}
        />
      </Box>
    </Stack>
  );
}
