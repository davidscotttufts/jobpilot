import { startOfDay } from "@/common/date/buckets";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  detectEligibilityRestrictions,
  ELIGIBILITY_RESTRICTION_KINDS,
} from "@/modules/scoring/eligibility";

/** Applications for the profile since UTC midnight - the daily apply budget's numerator. */
export function countAppliedToday(
  prisma: Pick<PrismaClient, "application">,
  userId: string,
  now: Date,
): Promise<number> {
  return prisma.application.count({
    where: { userId, appliedAt: { gte: startOfDay(now) } },
  });
}

/** Networking messages sent for the profile since UTC midnight - the daily networking cap's numerator. */
export function countSentToday(
  prisma: Pick<PrismaClient, "networkingMessage">,
  userId: string,
  now: Date,
): Promise<number> {
  return prisma.networkingMessage.count({
    where: { userId, sentAt: { gte: startOfDay(now) } },
  });
}

/** Reuses the scoring module's eligibility kinds; a private copy would drift from its patterns. */
export const SKIP_BUCKETS = [
  ...ELIGIBILITY_RESTRICTION_KINDS,
  "alreadyApplied",
  "captcha",
  "payment",
  "belowMinScore",
  "capReached",
  "postingClosed",
  "other",
] as const;
export type SkipBucket = (typeof SKIP_BUCKETS)[number];

/**
 * Buckets a free-text `skipReason`; agent-written prose means grouping the raw column in SQL yields
 * one row per wording. The literal checks match the phrasings `_shared/eligibility.md` tells the
 * agent to write.
 */
export function classifySkipReason(reason: string): SkipBucket {
  const blocked = detectEligibilityRestrictions(reason)[0];
  if (blocked) return blocked.kind;

  const text = reason.toLowerCase();
  if (text.includes("already applied")) return "alreadyApplied";
  if (text.includes("captcha")) return "captcha";
  if (text.includes("payment")) return "payment";
  if (text.includes("minimum match score") || text.includes("below min")) return "belowMinScore";
  if (text.includes("cap reached") || text.includes("daily cap")) return "capReached";
  if (text.includes("expired") || text.includes("no longer") || text.includes("closed")) {
    return "postingClosed";
  }
  return "other";
}

export interface PilotTodayOutcomes {
  skipped: number;
  failed: number;
  /** Buckets, most frequent first. Empty when nothing was skipped today. */
  skipReasons: { reason: SkipBucket; count: number }[];
}

/** Excludes applied on purpose: pilot state already reports that from `Application`. */
export async function countTodayOutcomes(
  prisma: Pick<PrismaClient, "job">,
  userId: string,
  now: Date,
): Promise<PilotTodayOutcomes> {
  const where = { campaign: { userId }, updatedAt: { gte: startOfDay(now) } };

  const [byStatus, skippedRows] = await Promise.all([
    prisma.job.groupBy({
      by: ["status"],
      where: { ...where, status: { in: ["skipped", "failed"] } },
      _count: { _all: true },
    }),
    // A day's skips are tens of rows, and the bucketing rule can't run in SQL.
    prisma.job.findMany({
      where: { ...where, status: "skipped", skipReason: { not: null } },
      select: { skipReason: true },
    }),
  ]);

  const counts = new Map<SkipBucket, number>();
  for (const row of skippedRows) {
    const bucket = classifySkipReason(row.skipReason ?? "");
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const statusCount = (status: "skipped" | "failed") =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;

  return {
    skipped: statusCount("skipped"),
    failed: statusCount("failed"),
    skipReasons: [...counts]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}
