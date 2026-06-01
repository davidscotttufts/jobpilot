import { z } from "zod/v4";
import { patchCampaignJobSchema } from "@/lib/contracts/campaign";
import { api } from "@/server/api/route";
import { patchCampaignJob } from "@/server/campaigns/job-patch";

const campaignJobParams = z.object({ id: z.string(), key: z.string() });

export const PATCH = api.profileRoute(
  { params: campaignJobParams, body: patchCampaignJobSchema },
  ({ params, body, profileId }) =>
    patchCampaignJob({ campaignId: params.id, key: params.key, profileId, patch: body }),
);
