import type { PilotRunResultInput } from "@jobpilot/contracts/pilot";
import { singleton } from "tsyringe";
import { DAY_MS } from "@/common/date/buckets";
import { PrismaClient } from "@/generated/prisma/client";
import { RETENTION_DAYS } from "@/modules/maintenance/retention";

type ResultHint = PilotRunResultInput["hints"][number];

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

@singleton()
export class SiteHintService {
  constructor(private readonly prisma: PrismaClient) {}

  async record(hints: ResultHint[]) {
    for (const { domain, text } of hints) {
      const key = { domain: normalizeDomain(domain), hint: text };
      await this.prisma.siteHint.upsert({
        where: { domain_hint: key },
        create: key,
        update: { seenCount: { increment: 1 }, lastSeenAt: new Date() },
      });
    }
  }

  /** Hints unseen past the retention window are about to be swept, so they are left out now. */
  list(domain: string) {
    const since = new Date(Date.now() - RETENTION_DAYS.siteHint * DAY_MS);
    return this.prisma.siteHint.findMany({
      where: { domain: normalizeDomain(domain), lastSeenAt: { gte: since } },
      orderBy: [{ seenCount: "desc" }, { lastSeenAt: "desc" }],
      take: 5,
      select: { domain: true, hint: true, seenCount: true, lastSeenAt: true },
    });
  }
}
