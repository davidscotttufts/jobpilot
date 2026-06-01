"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Box, Button, Chip, Collapse, Grid, Stack, Typography } from "@mui/material";
import { SectionCard } from "@/components/ui/layout";
import type { RunJobStatus } from "@/lib/contracts/run";
import type { RunDetailDto, RunJobDto } from "@/types/api";

interface ReasonCount {
  reason: string;
  count: number;
}

function groupReasons(
  jobs: ReadonlyArray<RunJobDto>,
  status: RunJobStatus,
  pick: (job: RunJobDto) => string | null,
): ReasonCount[] {
  const counts = new Map<string, number>();

  for (const job of jobs) {
    if (job.status !== status) {
      continue;
    }
    const reason = pick(job)?.trim() || "Unspecified";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

function ReasonList(props: { title: string; reasons: ReasonCount[] }): ReactElement {
  const { title, reasons } = props;
  return (
    <Stack spacing={1}>
      <Typography variant="overlineMuted">{title}</Typography>
      {reasons.length === 0 ? (
        <Typography variant="captionMuted">None</Typography>
      ) : (
        <Box sx={{ maxHeight: { xs: 320, sm: 420 }, overflowY: "auto", pr: 1 }}>
          <Stack spacing={1}>
            {reasons.map((r) => (
              <Stack
                key={r.reason}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Typography variant="body2" sx={{ minWidth: 0, wordBreak: "break-word" }}>
                  {r.reason}
                </Typography>
                <Chip size="small" label={r.count} variant="outlined" />
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

interface RunReasonBreakdownProps {
  run: RunDetailDto;
}

/** Groups skip/fail reasons by frequency so the user can see why jobs dropped out. */
export function RunReasonBreakdown(props: RunReasonBreakdownProps): ReactNode {
  const { run } = props;
  const [open, setOpen] = useState(true);

  const skipped = groupReasons(run.jobs, "skipped", (j) => j.skipReason);
  const failed = groupReasons(run.jobs, "failed", (j) => j.failReason);

  if (skipped.length === 0 && failed.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="Why jobs dropped out"
      actions={
        <Button
          size="small"
          variant="text"
          startIcon={open ? <ExpandLess fontSize="sm" /> : <ExpandMore fontSize="sm" />}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "Show"}
        </Button>
      }
    >
      <Collapse in={open}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ReasonList title={`Skipped (${run.summary.skipped})`} reasons={skipped} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ReasonList title={`Failed (${run.summary.failed})`} reasons={failed} />
          </Grid>
        </Grid>
      </Collapse>
    </SectionCard>
  );
}
