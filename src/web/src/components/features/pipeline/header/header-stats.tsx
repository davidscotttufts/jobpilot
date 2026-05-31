"use client";

import type { ReactElement } from "react";
import { Typography } from "@mui/material";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { type PipelineColumnPage, type PipelineStage } from "@/types/api";

function useStageTotal(stage: PipelineStage): number {
  const query = useApiQuery<PipelineColumnPage>(queryKeys.pipeline.total(stage), () =>
    apiClient.get<PipelineColumnPage>(`/api/pipeline?stage=${stage}&limit=1`),
  );
  return query.data?.total ?? 0;
}

export function PipelineHeaderStats(): ReactElement {
  const queued = useStageTotal("queued");
  const applying = useStageTotal("applying");
  const submitted = useStageTotal("submitted");
  const interviewing = useStageTotal("interviewing");

  const total = queued + applying + submitted + interviewing;

  return (
    <Typography variant="body2Muted">
      {total} jobs · {submitted} submitted · {interviewing} interviewing
    </Typography>
  );
}
