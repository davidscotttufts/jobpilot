"use client";

import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { AddQueueEntry } from "@/lib/schemas/queue";
import { AddUrlsDialog } from "./dialogs/add-urls-dialog";
import { AutopilotDialog, type AutopilotDialogMode } from "./dialogs/autopilot-dialog";

interface AddUrlsResponse {
  inserted: number;
}

export interface PipelineActionsValue {
  openAutopilot: () => void;
  openSearch: () => void;
  openAddUrls: () => void;
}

const PipelineActionsContext = createContext<PipelineActionsValue | null>(null);

export function PipelineActionsProvider(props: PropsWithChildren): ReactElement {
  const { children } = props;
  const [autopilotMode, setAutopilotMode] = useState<AutopilotDialogMode | null>(null);
  const [addUrlsOpen, setAddUrlsOpen] = useState(false);

  const create = useApiMutation<AddUrlsResponse, AddQueueEntry>(
    (vars) => apiClient.post<AddUrlsResponse>("/api/queue", vars),
    {
      successMessage: (data) => `Queued ${data.inserted} URL${data.inserted === 1 ? "" : "s"}`,
      invalidate: [queryKeys.queue.all, queryKeys.pipeline.all],
      onSuccess: () => setAddUrlsOpen(false),
    },
  );

  const value: PipelineActionsValue = {
    openAutopilot: () => setAutopilotMode("autopilot"),
    openSearch: () => setAutopilotMode("search"),
    openAddUrls: () => setAddUrlsOpen(true),
  };

  return (
    <PipelineActionsContext.Provider value={value}>
      {children}
      <AutopilotDialog
        open={autopilotMode !== null}
        mode={autopilotMode ?? "autopilot"}
        onClose={() => setAutopilotMode(null)}
      />
      <AddUrlsDialog
        key={addUrlsOpen ? "open" : "closed"}
        open={addUrlsOpen}
        onClose={() => setAddUrlsOpen(false)}
        onSubmit={(values) => create.mutate(values)}
        submitting={create.isPending}
      />
    </PipelineActionsContext.Provider>
  );
}

export function usePipelineActions(): PipelineActionsValue {
  const ctx = useContext(PipelineActionsContext);
  if (!ctx) {
    throw new Error("usePipelineActions must be used within a PipelineActionsProvider");
  }
  return ctx;
}
