import { DAY_MS, startOfDay } from "@/common/date/buckets";
import type { PrismaClient } from "@/generated/prisma/client";
import { classifySkipReason, type SkipBucket } from "./skip-reasons";
import { isCrash } from "./tasks/runs";

/** Runs older than a week describe a version of the agent you are no longer running. */
const COST_WINDOW_MS = 7 * DAY_MS;

export function countAppliedToday(
  prisma: Pick<PrismaClient, "application">,
  userId: string,
  now: Date,
): Promise<number> {
  return prisma.application.count({ where: { userId, appliedAt: { gte: startOfDay(now) } } });
}

export function countSentToday(
  prisma: Pick<PrismaClient, "networkingMessage">,
  userId: string,
  now: Date,
): Promise<number> {
  return prisma.networkingMessage.count({ where: { userId, sentAt: { gte: startOfDay(now) } } });
}

/** Today's skipped and failed jobs, with skip reasons bucketed most frequent first. */
export async function countTodayOutcomes(
  prisma: Pick<PrismaClient, "job">,
  userId: string,
  now: Date,
) {
  const where = { campaign: { userId }, updatedAt: { gte: startOfDay(now) } };
  const [byStatus, skipped] = await Promise.all([
    prisma.job.groupBy({
      by: ["status"],
      where: { ...where, status: { in: ["skipped", "failed"] } },
      _count: { _all: true },
    }),
    // Tens of rows a day, and the bucketing can't run in SQL.
    prisma.job.findMany({
      where: { ...where, status: "skipped", skipReason: { not: null } },
      select: { skipReason: true },
    }),
  ]);

  const counts = new Map<SkipBucket, number>();
  for (const { skipReason } of skipped) {
    const bucket = classifySkipReason(skipReason ?? "");
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  const countOf = (status: "skipped" | "failed") =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;

  return {
    skipped: countOf("skipped"),
    failed: countOf("failed"),
    skipReasons: [...counts]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Where the week's tokens went, by task type, heaviest first. A run carries its cycle's usage. */
export async function costByTaskType(
  prisma: Pick<PrismaClient, "pilotRun">,
  userId: string,
  now: Date,
) {
  const rows = await prisma.pilotRun.findMany({
    where: {
      userId,
      finishedAt: { not: null },
      startedAt: { gte: new Date(now.getTime() - COST_WINDOW_MS) },
    },
    // Uncapped: any cap short enough to matter would quietly shorten the week being reported.
    select: {
      taskType: true,
      outcome: true,
      inputTokens: true,
      outputTokens: true,
      cacheReadTokens: true,
      cacheWriteTokens: true,
    },
  });

  return [...Map.groupBy(rows, (run) => run.taskType)]
    .map(([taskType, runs]) => {
      const tokens = runs
        .map(
          (run) => run.inputTokens + run.outputTokens + run.cacheReadTokens + run.cacheWriteTokens,
        )
        .sort((a, b) => a - b);
      return {
        taskType,
        runs: runs.length,
        medianTokens: median(tokens),
        totalTokens: tokens.reduce((sum, count) => sum + count, 0),
        failed: runs.filter((run) => run.outcome === "failed").length,
        abandoned: runs.filter((run) => isCrash(run.outcome)).length,
      };
    })
    .sort((a, b) => b.totalTokens - a.totalTokens);
}
