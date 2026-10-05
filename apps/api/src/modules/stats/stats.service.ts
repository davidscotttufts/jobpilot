import { singleton } from "tsyringe";
import { DAY_MS, startOfDay } from "@/common/date/buckets";
import { MemoryCache } from "@/common/memory-cache";
import { PrismaClient } from "@/generated/prisma/client";
import type { PublicStats } from "./stats.schema";

const WINDOW_DAYS = 30;
const STATS_TTL_MS = 5 * 60_000;

@singleton()
export class StatsService {
  private readonly cache = new MemoryCache<"public", PublicStats>({ ttlMs: STATS_TTL_MS });

  constructor(private readonly prisma: PrismaClient) {}

  /** Unauthenticated, so cached: every landing-page render would otherwise rescan the window. */
  publicStats(): Promise<PublicStats> {
    return this.cache.getOrLoad("public", () => this.load());
  }

  private async load(): Promise<PublicStats> {
    const since = new Date(startOfDay(new Date()).getTime() - (WINDOW_DAYS - 1) * DAY_MS);
    const [jobListings, applications, [active]] = await Promise.all([
      this.prisma.jobListing.count({ where: { status: "published" } }),
      this.prisma.application.count({ where: { appliedAt: { gte: since } } }),
      this.prisma.$queryRaw<{ users: number }[]>`
        SELECT count(*)::int AS users FROM (
          SELECT user_id FROM applications WHERE applied_at >= ${since}
          UNION
          SELECT user_id FROM networking_messages WHERE sent_at >= ${since}
        ) active`,
    ]);

    return {
      jobListings,
      applicationsLast30Days: applications,
      activeUsersLast30Days: active.users,
    };
  }
}
