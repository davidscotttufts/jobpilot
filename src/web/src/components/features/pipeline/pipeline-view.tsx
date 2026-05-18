"use client";

import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/api/query-keys";
import { PIPELINE_EVENTS_URL, type PipelineEvent } from "@/lib/sse/run-events";
import { useEventSource } from "@/lib/sse/use-event-source";
import { PIPELINE_STAGES, type PipelineJobDto } from "@/types/api";
import { PipelineColumn } from "./board/column";
import { usePipelineFilters } from "./hooks/use-pipeline-filters";

export function PipelineView(): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { filters } = usePipelineFilters();

  useEventSource<PipelineEvent>(PIPELINE_EVENTS_URL, {
    onMessage: (event) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all });
      if (event.type === "run.updated" || event.type === "run.completed") {
        queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      }
    },
  });

  const handleJobClick = (job: PipelineJobDto): void => {
    if (job.applicationId !== null) {
      router.push(`/applications/${job.applicationId}` as Parameters<typeof router.push>[0]);
    } else if (job.runId !== null) {
      router.push(`/runs/${job.runId}` as Parameters<typeof router.push>[0]);
    } else if (job.url) {
      window.open(job.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        flex: 1,
        minHeight: 0,
        paddingInline: 2.5,
        paddingBlock: 2,
        overflowX: "auto",
      }}
    >
      {PIPELINE_STAGES.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          filters={filters}
          onJobClick={handleJobClick}
        />
      ))}
    </Stack>
  );
}
