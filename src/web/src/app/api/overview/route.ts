import { ok } from "@/lib/api";
import { db } from "@/lib/db";
import type {
  OverviewPerDayEntry,
  OverviewStageBreakdownEntry,
  OverviewStatsDto,
  OverviewTopBoardEntry,
  OverviewTopReasonEntry,
} from "@/types/api/overview";

const NON_INTERVIEWING_STAGES = ["applied", "rejected", "withdrawn"] as const;
const DAYS_IN_TIMELINE = 30;

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfWeek(): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - 6);
  return d;
}

function startOfTimeline(): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - (DAYS_IN_TIMELINE - 1));
  return d;
}

function isoDateKey(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}

export async function GET() {
  const weekStart = startOfWeek();
  const timelineStart = startOfTimeline();

  const [
    totalApplications,
    totalSubmitted,
    totalInterviewing,
    totalOffers,
    totalRejected,
    queueDepth,
    weekSubmitted,
    weekInterviewing,
    weekRejected,
    stageGroupRows,
    timelineRows,
    boardGroupRows,
    failReasonRows,
  ] = await Promise.all([
    db.application.count(),
    db.application.count({ where: { stage: "applied" } }),
    db.application.count({ where: { stage: { notIn: [...NON_INTERVIEWING_STAGES] } } }),
    db.application.count({ where: { stage: "offer" } }),
    db.application.count({ where: { stage: "rejected" } }),
    db.queueEntry.count({ where: { status: "pending" } }),
    db.application.count({ where: { stage: "applied", appliedAt: { gte: weekStart } } }),
    db.application.count({
      where: {
        stage: { notIn: [...NON_INTERVIEWING_STAGES] },
        appliedAt: { gte: weekStart },
      },
    }),
    db.application.count({
      where: { stage: "rejected", appliedAt: { gte: weekStart } },
    }),
    db.application.groupBy({
      by: ["stage"],
      _count: { _all: true },
    }),
    db.application.findMany({
      where: { appliedAt: { gte: timelineStart } },
      select: { appliedAt: true },
    }),
    db.application.groupBy({
      by: ["board"],
      where: { board: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    db.runJob.groupBy({
      by: ["failReason"],
      where: { failReason: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  const stageBreakdown: OverviewStageBreakdownEntry[] = stageGroupRows.map((r) => ({
    stage: r.stage,
    count: r._count._all,
  }));

  const perDayMap = new Map<string, number>();
  for (let i = 0; i < DAYS_IN_TIMELINE; i++) {
    const d = new Date(timelineStart);
    d.setDate(d.getDate() + i);
    perDayMap.set(isoDateKey(d), 0);
  }
  for (const row of timelineRows) {
    const key = isoDateKey(row.appliedAt);
    if (perDayMap.has(key)) {
      perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1);
    }
  }
  const perDay: OverviewPerDayEntry[] = Array.from(perDayMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const topBoards: OverviewTopBoardEntry[] = boardGroupRows
    .filter((r) => r.board)
    .map((r) => ({ board: r.board as string, count: r._count._all }));

  const topRejectReasons: OverviewTopReasonEntry[] = failReasonRows
    .filter((r) => r.failReason)
    .map((r) => ({ reason: r.failReason as string, count: r._count._all }));

  const responded = totalInterviewing + totalRejected;
  const responseRatePct =
    totalSubmitted + responded > 0
      ? Math.round((responded / (totalSubmitted + responded)) * 100)
      : 0;

  const stats: OverviewStatsDto = {
    totals: {
      applications: totalApplications,
      submitted: totalSubmitted,
      interviewing: totalInterviewing,
      offers: totalOffers,
      rejected: totalRejected,
      queueDepth,
    },
    thisWeek: {
      submitted: weekSubmitted,
      interviewing: weekInterviewing,
      rejected: weekRejected,
    },
    responseRatePct,
    stageBreakdown,
    perDay,
    topBoards,
    topRejectReasons,
  };

  return ok(stats);
}
