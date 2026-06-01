import { z } from "zod/v4";
import { campaignEventSchema } from "@/lib/contracts/campaign";
import { campaignChannel } from "@/lib/sse/channels/campaign";
import { sseResponse, subscribe } from "@/lib/sse/server";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";
import { recordCampaignEvent } from "@/server/campaigns/events";
import { db } from "@/server/db";

const campaignParams = z.object({ id: z.string() });

export const GET = api.profileRoute({ params: campaignParams }, async ({ params, profileId }) => {
  await findOwned(
    (where) => db.campaign.findFirst({ where, select: { campaignId: true } }),
    { campaignId: params.id, profileId },
    "Campaign",
  );
  return sseResponse(subscribe(campaignChannel, { campaignId: params.id }));
});

export const POST = api.profileRoute(
  { params: campaignParams, body: campaignEventSchema },
  ({ params, body, profileId }) =>
    recordCampaignEvent({ campaignId: params.id, profileId, event: body }),
);
