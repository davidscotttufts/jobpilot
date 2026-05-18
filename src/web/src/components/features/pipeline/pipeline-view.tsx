"use client";

import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { type PipelineJobDto } from "@/types/api";
import { PipelineBoard } from "./pipeline-board";
import { usePipelineFilters } from "./use-pipeline-filters";

export function PipelineView(): ReactElement {
  const router = useRouter();
  const { filters } = usePipelineFilters();

  return (
    <PipelineBoard
      filters={filters}
      onJobClick={(job: PipelineJobDto) => {
        if (job.applicationId !== null) {
          router.push(`/applications/${job.applicationId}` as Parameters<typeof router.push>[0]);
        } else if (job.runId !== null) {
          router.push(`/runs/${job.runId}` as Parameters<typeof router.push>[0]);
        }
      }}
    />
  );
}
