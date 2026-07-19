import { findOwned } from "@/common/errors";
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
