"use client";

import type { ReactNode } from "react";
import { Close } from "@mui/icons-material";
import { Button, Card, CardActions, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import { RUN_STATUS_COLOR, RUN_STATUS_LABEL } from "@/components/features/runs/run-status";
import { LinkButton } from "@/components/ui/buttons";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { RunDto } from "@/types/api";
import { usePipelineFilters } from "../hooks/use-pipeline-filters";

/**
 * Banner shown above the board when it is scoped to a run. Reads the run from
 * the (cached) runs list shared with the rail — no extra fetch. Renders nothing
 * when no run is scoped.
 */
export function PipelineScopeBanner(): ReactNode {
  const { runId, setRunId } = usePipelineFilters();
  const runs = useApiQuery<RunDto[]>(queryKeys.runs.list(), () =>
    apiClient.get<RunDto[]>("/api/runs"),
  );

  if (!runId) {
    return null;
  }

  const run = runs.data?.find((r) => r.runId === runId) ?? null;

  return (
    <Card sx={{ mx: 2.5, mt: 2, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
      <CardContent sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="overlineMuted">Scoped to run</Typography>
          {run && (
            <Chip
              size="small"
              label={RUN_STATUS_LABEL[run.status]}
              color={RUN_STATUS_COLOR[run.status]}
              variant="outlined"
            />
          )}
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
            {run?.query ?? runId}
          </Typography>
          {run && (
            <Typography variant="captionMuted">
              {run.summary.applied} applied · {run.summary.failed} failed · {run.summary.skipped}{" "}
              skipped
            </Typography>
          )}
        </Stack>
      </CardContent>
      <CardActions>
        <LinkButton
          size="small"
          variant="text"
          href={`/runs/${encodeURIComponent(runId)}` as Route}
        >
          View details
        </LinkButton>
        <Button
          size="small"
          variant="text"
          startIcon={<Close fontSize="sm" />}
          onClick={() => setRunId(null)}
        >
          Clear scope
        </Button>
      </CardActions>
    </Card>
  );
}
