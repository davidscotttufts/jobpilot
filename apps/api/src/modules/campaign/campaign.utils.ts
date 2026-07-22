import { campaignChannel, workspaceChannel } from "@jobpilot/contracts/sse";
import { findOwned } from "@/common/errors";
import { publish } from "@/common/sse";
import type { PrismaClient } from "@/generated/prisma/client";

/** Throws 404 unless `campaignId` belongs to `userId`. Shared by the core,
 * job, and networking services so none has to inject another. */
export async function ensureCampaignOwned(
  prisma: PrismaClient,
  userId: string,
  campaignId: string,
): Promise<void> {
  await findOwned(
    (where) => prisma.campaign.findFirst({ where, select: { campaignId: true } }),
    { campaignId, userId },
    "Campaign",
  );
}

/** The SSE fan-out every completion emits, whichever path did the write. */
export function publishCampaignCompleted(userId: string, campaignId: string): void {
  publish(campaignChannel, { campaignId }, { type: "status", payload: { status: "completed" } });
  publish(workspaceChannel, { userId }, { type: "campaign.completed", campaignId });
}
