import type { CampaignJob, CampaignStatus, CampaignSummary } from "../../campaign";
import { defineChannel } from "../channel";

export type CampaignEvent =
  | { type: "progress"; payload: CampaignSummary }
  | { type: "status"; payload: { status: CampaignStatus } }
  | { type: "job-update"; payload: { kind: "added" | "updated"; job: CampaignJob } }
  | { type: "networking-update" };

/** Live event feed scoped to a single campaign (progress, status, job updates). */
export const campaignChannel = defineChannel<CampaignEvent, { campaignId: string }>({
  name: "campaign",
  path: ({ campaignId }) => `/api/campaigns/${encodeURIComponent(campaignId)}/events`,
  topic: ({ campaignId }) => campaignId,
});
