"use client";

import type { ReactNode } from "react";
import { workspaceChannel } from "@jobpilot/contracts/sse";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { useSseChannel } from "@/lib/sse/client";

/** The workspace layout's one SSE subscription; any event refreshes campaigns and applications. */
export function WorkspaceLive(): ReactNode {
  const queryClient = useQueryClient();

  useSseChannel(workspaceChannel, null, {
    onMessage: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
    },
  });

  return null;
}
