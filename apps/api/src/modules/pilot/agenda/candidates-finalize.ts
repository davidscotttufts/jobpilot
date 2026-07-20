import { CAMPAIGN_JOB_ACTIVE_STATUSES } from "@jobpilot/contracts/campaign";
import type { PrismaClient } from "@/generated/prisma/client";
import { FINALIZE_IDLE_MS } from "./constants";
import type { AgendaFinalizeCampaign } from "./types";

/** Finds source-aware campaigns whose active work is exhausted. */
export function gatherFinalizeCampaigns(
  prisma: PrismaClient,
  userId: string,
  now: Date,
): Promise<AgendaFinalizeCampaign[]> {
  // Idle guard: completing is terminal, and a user may be mid-session adding jobs in the
  // terminal - recent job activity means the campaign isn't ours to close yet.
  const idleCutoff = new Date(now.getTime() - FINALIZE_IDLE_MS);
  return prisma.campaign.findMany({
    where: {
      userId,
      status: "in_progress",
      jobs: { none: { updatedAt: { gt: idleCutoff } } },
      OR: [
        {
          source: { not: "networking" },
          jobs: { none: { status: { in: [...CAMPAIGN_JOB_ACTIVE_STATUSES] } } },
        },
        {
          source: "networking",
          networkingMessages: { none: { status: { in: ["draft", "approved"] } } },
        },
      ],
    },
    select: { campaignId: true, query: true },
  });
}
