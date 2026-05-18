"use client";

import type { ReactElement } from "react";
import { ArrowDropDown, PlayArrow } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import { DropdownMenu } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useAgent } from "@/providers/agent-provider";
import type { PipelineColumnPage } from "@/types/api";
import { usePipelineActions } from "../actions-provider";

function useQueuedTotal(): number {
  const query = useApiQuery<PipelineColumnPage>(queryKeys.pipeline.total("queued"), () =>
    apiClient.get<PipelineColumnPage>("/api/pipeline?stage=queued&limit=1"),
  );
  return query.data?.total ?? 0;
}

export function RunLauncherButton(): ReactElement {
  const agent = useAgent();
  const actions = usePipelineActions();
  const queued = useQueuedTotal();

  return (
    <DropdownMenu
      minWidth={220}
      trigger={({ onOpen }) => (
        <Button
          variant="contained"
          size="small"
          startIcon={<PlayArrow fontSize="md" />}
          endIcon={<ArrowDropDown fontSize="md" />}
          onClick={onOpen}
        >
          Run
        </Button>
      )}
      items={[
        {
          kind: "item",
          key: "drain",
          label: "Drain queued",
          icon: <PlayArrow fontSize="sm" />,
          trailing: (
            <Typography variant="captionMuted" sx={{ ml: 2 }}>
              {queued}
            </Typography>
          ),
          disabled: queued === 0,
          onClick: () => {
            void agent.injectSkill("apply");
          },
        },
        {
          kind: "item",
          key: "autopilot",
          label: "Autopilot search…",
          onClick: actions.openAutopilot,
        },
        { kind: "item", key: "search", label: "Search only…", onClick: actions.openSearch },
      ]}
    />
  );
}
