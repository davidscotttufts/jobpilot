"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEventSource } from "@/lib/sse/use-event-source";
import { queryKeys } from "@/lib/api/query-keys";
import type { RunEventInput } from "@/lib/schemas/run";

/**
 * Subscribe to /api/runs/:runId/events. On every event, invalidate the
 * run detail query so the UI refetches the canonical state. Simpler than
 * doing surgical setQueryData updates and avoids divergence when the
 * server schema evolves.
 */
export function useRunEvents(runId: string | undefined): void {
  const queryClient = useQueryClient();
  const url = runId ? `/api/runs/${encodeURIComponent(runId)}/events` : undefined;

  useEventSource<RunEventInput>(url, {
    onMessage: () => {
      if (!runId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.detail(runId) });
    },
  });
}
