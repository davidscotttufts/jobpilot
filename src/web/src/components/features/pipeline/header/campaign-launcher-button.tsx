"use client";

import type { ReactElement } from "react";
import { ArrowDropDown, PlayArrow } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/client/api";
import { queryKeys } from "@/lib/client/query-keys";
import { useAgent } from "@/providers/agent-provider";
import type { PipelineColumnPage } from "@/types/api";

function useQueuedTotal(): number {
  const query = useApiQuery<PipelineColumnPage>(queryKeys.pipeline.total("queued"), () =>
    apiClient.get<PipelineColumnPage>("/api/pipeline?stage=queued&limit=1"),
  );
  return query.data?.total ?? 0;
}

export function CampaignLauncherButton(): ReactElement {
  const router = useRouter();
  const agent = useAgent();
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
          Campaign
        </Button>
      )}
      items={[
        {
          kind: "item",
          key: "new",
          label: "New campaign…",
          icon: <PlayArrow fontSize="sm" />,
          onClick: () => router.push("/campaigns/new"),
        },
        {
          kind: "item",
          key: "drain",
          label: "Drain queued",
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
      ]}
    />
  );
}
