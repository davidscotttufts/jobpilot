import { singleton } from "tsyringe";
import { DAY_MS, startOfDay } from "@/common/date/buckets";
import { TtlCache } from "@/common/ttl-cache";
import { PrismaClient } from "@/generated/prisma/client";
import type { PublicStats } from "./stats.schema";

const WINDOW_DAYS = 30;
const STATS_TTL_MS = 5 * 60_000;

@singleton()
export class StatsService {
  private readonly cache = new TtlCache(() => this.load(), STATS_TTL_MS);

  constructor(private readonly prisma: PrismaClient) {}

  /** Unauthenticated, so cached: every landing-page render would otherwise rescan the window. */
  publicStats(): Promise<PublicStats> {
    return this.cache.get();
  }

  private async load(): Promise<PublicStats> {
    const since = new Date(startOfDay(new Date()).getTime() - (WINDOW_DAYS - 1) * DAY_MS);
    const [jobListings, applications, appliers, messagers] = await Promise.all([
      this.prisma.jobListing.count({ where: { status: "published" } }),
      this.prisma.application.count({ where: { appliedAt: { gte: since } } }),
      this.prisma.application.groupBy({ by: ["userId"], where: { appliedAt: { gte: since } } }),
      this.prisma.networkingMessage.groupBy({ by: ["userId"], where: { sentAt: { gte: since } } }),
    ]);
    const activeUsers = new Set([...appliers, ...messagers].map((row) => row.userId));

    return {
      jobListings,
      applicationsLast30Days: applications,
      activeUsersLast30Days: activeUsers.size,
    };
  }
}
