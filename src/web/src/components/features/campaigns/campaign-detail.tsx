"use client";

import type { ReactElement } from "react";
import { LinearProgress, Stack } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { OutreachBoard } from "@/components/features/outreach";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/client/api";
import { queryKeys } from "@/lib/client/query-keys";
import { campaignChannel } from "@/lib/sse/channels/campaign";
import { useSseChannel } from "@/lib/sse/client";
import { useAgent } from "@/providers/agent-provider";
import type { CampaignDetailDto, CampaignJobDto } from "@/types/api";
import { CampaignHeaderCard } from "./detail/header-card";
import { CampaignJobsPanel } from "./detail/jobs-panel";
import { CampaignReasonBreakdown } from "./detail/reason-breakdown";
import { CampaignSummaryTiles } from "./detail/summary-tiles";

interface CampaignDetailProps {
  campaignId: string;
}

export function CampaignDetail(props: CampaignDetailProps): ReactElement {
  const { campaignId } = props;
  const queryClient = useQueryClient();
  const agent = useAgent();

  const detail = useApiQuery<CampaignDetailDto>(queryKeys.campaigns.detail(campaignId), () =>
    apiClient.get<CampaignDetailDto>(`/api/campaigns/${encodeURIComponent(campaignId)}`),
  );

  useSseChannel(
    campaignChannel,
    { campaignId },
    {
      onMessage: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.detail(campaignId) });
      },
    },
  );

  if (detail.isLoading || !detail.data) {
    return <LinearProgress />;
  }

  const campaign = detail.data;
  const isAutoApply = campaign.source === "auto-apply";

  if (campaign.source === "outreach") {
    return (
      <Stack spacing={3}>
        <CampaignHeaderCard campaign={campaign} />
        <OutreachBoard
          campaignId={campaignId}
          summary={campaign.summary}
          config={campaign.config.outreach}
        />
      </Stack>
    );
  }

  // Auto-apply campaigns apply on their own; on other campaigns (e.g. search results) the
  // user dispatches a job to the single-job apply flow by its URL.
  const applyJob = (job: CampaignJobDto): void => {
    if (!isAutoApply) {
      return;
    }
    void agent.injectSkill("apply", job.url);
  };

  return (
    <Stack spacing={3}>
      <CampaignHeaderCard campaign={campaign} />
      <CampaignSummaryTiles campaign={campaign} />
      <CampaignReasonBreakdown campaign={campaign} />
      <CampaignJobsPanel campaign={campaign} onApplyJob={applyJob} />
    </Stack>
  );
}
