import { singleton } from "tsyringe";
import { bucketPerDay, startOfTimeline, startOfWeek } from "@/common/date";
import { PrismaClient } from "@/generated/prisma/client";

const NON_INTERVIEWING_STATUSES = ["applied", "rejected", "withdrawn"] as const;

@singleton()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  async stats(profileId: string) {
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
      statusGroupRows,
      timelineRows,
      boardGroupRows,
      failReasonRows,
      outreachStatusRows,
      outreachContacts,
      outreachWeekSent,
      outreachWeekReplied,
      outreachTimelineRows,
      contactSourceRows,
    ] = await Promise.all([
      this.prisma.application.count({ where: { profileId } }),
      this.prisma.application.count({ where: { profileId, status: "applied" } }),
      this.prisma.application.count({
        where: { profileId, status: { notIn: [...NON_INTERVIEWING_STATUSES] } },
      }),
      this.prisma.application.count({ where: { profileId, status: "offer" } }),
      this.prisma.application.count({ where: { profileId, status: "rejected" } }),
      this.prisma.queueEntry.count({ where: { profileId, status: "pending" } }),
      this.prisma.application.count({
        where: { profileId, status: "applied", appliedAt: { gte: weekStart } },
      }),
      this.prisma.application.count({
        where: {
          profileId,
          status: { notIn: [...NON_INTERVIEWING_STATUSES] },
          appliedAt: { gte: weekStart },
        },
      }),
      this.prisma.application.count({
        where: { profileId, status: "rejected", appliedAt: { gte: weekStart } },
      }),
      this.prisma.application.groupBy({
        by: ["status"],
        where: { profileId },
        _count: { _all: true },
      }),
      this.prisma.application.findMany({
        where: { profileId, appliedAt: { gte: timelineStart } },
        select: { appliedAt: true },
      }),
      this.prisma.application.groupBy({
        by: ["board"],
        where: { profileId, board: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      this.prisma.job.groupBy({
        by: ["failReason"],
        where: { failReason: { not: null }, campaign: { profileId } },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      this.prisma.outreachMessage.groupBy({
        by: ["status"],
        where: { profileId },
        _count: { _all: true },
      }),
      this.prisma.outreachMessage.findMany({
        where: { profileId },
        select: { contactId: true },
        distinct: ["contactId"],
      }),
      this.prisma.outreachMessage.count({ where: { profileId, sentAt: { gte: weekStart } } }),
      this.prisma.outreachMessage.count({ where: { profileId, repliedAt: { gte: weekStart } } }),
      this.prisma.outreachMessage.findMany({
        where: { profileId, sentAt: { gte: timelineStart } },
        select: { sentAt: true },
      }),
      this.prisma.contact.groupBy({
        by: ["discoverySource"],
        where: { profileId, discoverySource: { not: null }, messages: { some: {} } },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    const statusBreakdown = statusGroupRows.map((r) => ({
      status: r.status,
      count: r._count._all,
    }));

    const perDay = bucketPerDay(
      timelineRows.map((r) => r.appliedAt),
      timelineStart,
    );

    const topBoards = boardGroupRows
      .filter((r) => r.board)
      .map((r) => ({ board: r.board as string, count: r._count._all }));

    const topRejectReasons = failReasonRows
      .filter((r) => r.failReason)
      .map((r) => ({ reason: r.failReason as string, count: r._count._all }));

    const responded = totalInterviewing + totalRejected;
    const responseRatePct =
      totalSubmitted + responded > 0
        ? Math.round((responded / (totalSubmitted + responded)) * 100)
        : 0;

    const outreachByStatus = new Map(outreachStatusRows.map((r) => [r.status, r._count._all]));
    const outreachReplied = outreachByStatus.get("replied") ?? 0;
    const outreachBounced = outreachByStatus.get("bounced") ?? 0;
    // Dispatched = every message that left: still-sent + replied + bounced.
    const outreachSent = (outreachByStatus.get("sent") ?? 0) + outreachReplied + outreachBounced;
    const replyRatePct = outreachSent > 0 ? Math.round((outreachReplied / outreachSent) * 100) : 0;

    const topContactSources = contactSourceRows
      .filter((r) => r.discoverySource)
      .map((r) => ({ source: r.discoverySource as string, count: r._count._all }));

    const perDaySent = bucketPerDay(
      outreachTimelineRows.map((r) => r.sentAt as Date),
      timelineStart,
    );

    const stats = {
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
      statusBreakdown,
      perDay,
      topBoards,
      topRejectReasons,
      outreach: {
        totals: {
          contacts: outreachContacts.length,
          sent: outreachSent,
          replied: outreachReplied,
          bounced: outreachBounced,
        },
        thisWeek: {
          sent: outreachWeekSent,
          replied: outreachWeekReplied,
        },
        replyRatePct,
        perDaySent,
        topContactSources,
      },
    };

    return stats;
  }
}
