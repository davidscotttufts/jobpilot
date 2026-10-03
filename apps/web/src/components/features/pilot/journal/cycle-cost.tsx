"use client";

import type { ReactElement } from "react";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { EmptyState, QuerySection } from "@/components/ui/data";
import { SectionCard } from "@/components/ui/layout";
import { formatTokens, plural } from "@/utils/format";
import { taskTypeLabel } from "../task-types";

export function CycleCost(): ReactElement {
  const query = useApiQuery(pilotQueries.cost(), { errorMessage: "Failed to load cycle costs" });
  const items = query.data?.items ?? [];
  const heaviest = items[0]?.totalTokens ?? 0;

  return (
    <SectionCard
      title="Where the tokens go"
      description="The last 7 days of runs by task type, heaviest first."
    >
      <QuerySection
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        errorTitle="Couldn't load cycle costs."
        isEmpty={items.length === 0}
        empty={<EmptyState variant="inline" title="No finished cycles in the last 7 days." />}
      >
        <Stack spacing={1.5}>
          {items.map((item) => (
            <Box key={item.taskType}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "baseline", justifyContent: "space-between" }}
              >
                <Typography variant="body2">{taskTypeLabel(item.taskType)}</Typography>
                <Typography variant="captionMuted">
                  {formatTokens(item.totalTokens)} tokens
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={heaviest > 0 ? (item.totalTokens / heaviest) * 100 : 0}
                sx={{ my: 0.5 }}
              />
              <Typography variant="captionMuted">
                {plural(item.runs, "run")} · {formatTokens(item.medianTokens)} typical
                {item.failed > 0 && ` · ${item.failed} failed`}
                {item.abandoned > 0 && ` · ${item.abandoned} abandoned`}
              </Typography>
            </Box>
          ))}
        </Stack>
      </QuerySection>
    </SectionCard>
  );
}
