import { resumeDataSchema } from "@jobpilot/contracts/resume";
import { parseAvailability } from "@jobpilot/contracts/user";
import { singleton } from "tsyringe";
import { bucketPerDay, DAY_MS, startOfDay } from "@/common/date";
import { notFound } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma/client";
import type { LeaderboardResponse, LeaderboardWindow, PortfolioResponse } from "./portfolio.schema";

const HEATMAP_DAYS = 365;

/** Interviewing = anything past the initial submit; mirrors analytics' non-interviewing set. */
const NON_INTERVIEWING_STATUSES = ["applied", "rejected", "withdrawn"] as const;

const WINDOW_DAYS: Record<Exclude<LeaderboardWindow, "all">, number> = { week: 7, month: 30 };

const LEADERBOARD_CAP = 50;
const LEADERBOARD_TTL_MS = 5 * 60 * 1000;

interface CachedLeaderboard {
  expires: number;
  data: LeaderboardResponse;
}

/** Backs the public /u/[username] page and /leaderboard - deliberately unauthenticated. */
@singleton()
export class PortfolioService {
  constructor(private readonly prisma: PrismaClient) {}

  // Cache is keyed by window; monotonic Date.now() TTL, no cross-user data (published only).
  private readonly leaderboardCache = new Map<LeaderboardWindow, CachedLeaderboard>();

  /** Public view: every account has an always-public portfolio; 404s only on an unknown username. */
  async byUsername(username: string): Promise<PortfolioResponse> {
    return this.build({ username }, "Portfolio not found");
  }

  /** Authed self-preview by user id (same card the public sees). */
  async previewByUserId(userId: string): Promise<PortfolioResponse> {
    return this.build({ id: userId }, "User not found");
  }

  private async build(
    where: { username: string } | { id: string },
    notFoundMessage: string,
  ): Promise<PortfolioResponse> {
    const user = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        username: true,
        availability: true,
        firstName: true,
        lastName: true,
        website: true,
        linkedin: true,
        github: true,
        city: true,
        state: true,
        primaryResumeId: true,
      },
    });

    if (!user) {
      throw notFound(notFoundMessage);
    }

    const start = this.heatmapStart();

    // Totals are counts (all-time); the heatmap only fetches rows inside its window, so row
    // transfer stays bounded to 365 days regardless of how long the account has been active.
    const [resume, applicationTotal, interviews, messageTotal, appliedDates, messages] =
      await Promise.all([
        user.primaryResumeId
          ? this.prisma.resume.findUnique({
              where: { id: user.primaryResumeId },
              select: { content: true },
            })
          : Promise.resolve(null),
        this.prisma.application.count({ where: { userId: user.id } }),
        this.prisma.application.count({
          where: { userId: user.id, status: { notIn: [...NON_INTERVIEWING_STATUSES] } },
        }),
        this.prisma.networkingMessage.count({
          where: { userId: user.id, sentAt: { not: null } },
        }),
        this.prisma.application.findMany({
          where: { userId: user.id, appliedAt: { gte: start } },
          select: { appliedAt: true },
        }),
        this.prisma.networkingMessage.findMany({
          where: { userId: user.id, sentAt: { gte: start } },
          select: { sentAt: true },
        }),
      ]);

    const messageDates = messages.map((m) => m.sentAt).filter((d): d is Date => d !== null);
    const perDay = bucketPerDay(
      [...appliedDates.map((a) => a.appliedAt), ...messageDates],
      start,
      HEATMAP_DAYS,
    );

    const content = this.parseResume(resume?.content ?? null);
    const username = user.username ?? "";
    const displayName = `${user.firstName} ${user.lastName}`.trim() || username;
    const location =
      [user.city, user.state].filter(Boolean).join(", ") || content?.basics.location || null;

    const cutoff = startOfDay(new Date()).getTime() - 29 * DAY_MS;
    const activityLast30 = perDay
      .filter((p) => p.date.getTime() >= cutoff)
      .reduce((n, p) => n + p.count, 0);
    const streaks = this.streaks(perDay);

    return {
      username,
      displayName,
      headline: content?.basics.headline?.trim() || null,
      location,
      availability: parseAvailability(user.availability),
      summary: content?.summary?.trim() || null,
      links: {
        website: user.website || content?.basics.website || null,
        linkedin: user.linkedin || content?.basics.linkedin || null,
        github: user.github || content?.basics.github || null,
      },
      skills: content ? content.skills.flatMap((g) => g.items) : [],
      primaryResumeId: user.primaryResumeId ?? null,
      perDay,
      stats: {
        applications: applicationTotal,
        interviews,
        messagesSent: messageTotal,
        activityLast30,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
      },
    };
  }

  async leaderboard(window: LeaderboardWindow = "month"): Promise<LeaderboardResponse> {
    const cached = this.leaderboardCache.get(window);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        availability: true,
        firstName: true,
        lastName: true,
        primaryResumeId: true,
      },
    });

    const userIds = users.map((u) => u.id);

    const gte =
      window === "all"
        ? undefined
        : new Date(startOfDay(new Date()).getTime() - (WINDOW_DAYS[window] - 1) * DAY_MS);
    const [appRows, msgRows] = await Promise.all([
      this.prisma.application.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, ...(gte ? { appliedAt: { gte } } : {}) },
        _count: { _all: true },
      }),
      this.prisma.networkingMessage.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, sentAt: gte ? { gte } : { not: null } },
        _count: { _all: true },
      }),
    ]);

    const counts = new Map<string, number>();
    for (const r of appRows) counts.set(r.userId, (counts.get(r.userId) ?? 0) + r._count._all);
    for (const r of msgRows) counts.set(r.userId, (counts.get(r.userId) ?? 0) + r._count._all);

    const ranked = users
      .map((u) => ({ u, activityCount: counts.get(u.id) ?? 0 }))
      .filter((r) => r.activityCount > 0)
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, LEADERBOARD_CAP);

    // Headline only for the ranked subset - avoids parsing every user's resume JSON.
    const resumeIds = ranked.map((r) => r.u.primaryResumeId).filter((id): id is string => !!id);
    const resumes = resumeIds.length
      ? await this.prisma.resume.findMany({
          where: { id: { in: resumeIds } },
          select: { id: true, content: true },
        })
      : [];
    const headlineById = new Map(
      resumes.map((r) => [r.id, this.parseResume(r.content)?.basics.headline?.trim() || null]),
    );

    const rows = ranked.map((r, i) => ({
      rank: i + 1,
      username: r.u.username ?? "",
      displayName: `${r.u.firstName} ${r.u.lastName}`.trim() || (r.u.username ?? ""),
      headline: r.u.primaryResumeId ? (headlineById.get(r.u.primaryResumeId) ?? null) : null,
      availability: parseAvailability(r.u.availability),
      activityCount: r.activityCount,
    }));

    const data: LeaderboardResponse = { window, rows };
    this.leaderboardCache.set(window, { expires: Date.now() + LEADERBOARD_TTL_MS, data });
    return data;
  }

  async sitemap(): Promise<{ username: string; updatedAt: Date }[]> {
    return this.prisma.user.findMany({
      select: { username: true, updatedAt: true },
      take: 5000,
    });
  }

  private heatmapStart(): Date {
    const d = startOfDay(new Date());
    d.setUTCDate(d.getUTCDate() - (HEATMAP_DAYS - 1));
    return d;
  }

  /** Current streak = consecutive active days ending today; longest = max run in the window. */
  private streaks(perDay: { date: Date; count: number }[]): { current: number; longest: number } {
    let longest = 0;
    let run = 0;
    for (const p of perDay) {
      run = p.count > 0 ? run + 1 : 0;
      if (run > longest) longest = run;
    }
    let current = 0;
    for (let i = perDay.length - 1; i >= 0 && perDay[i].count > 0; i--) current++;
    return { current, longest };
  }

  private parseResume(content: string | null) {
    if (!content) return null;
    try {
      const parsed = resumeDataSchema.safeParse(JSON.parse(content));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}
