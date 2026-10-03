import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { SiteHintService } from "./site-hint.service";
import { describe, expect, it } from "bun:test";

describe("SiteHintService.list", () => {
  it("returns the top 5 hints for the normalized domain seen in the last 60 days", async () => {
    const calls: Prisma.SiteHintFindManyArgs[] = [];
    const db = {
      siteHint: {
        findMany: async (args: Prisma.SiteHintFindManyArgs) => {
          calls.push(args);
          return [];
        },
      },
    };
    await new SiteHintService(db as unknown as PrismaClient).list("www.Greenhouse.io");

    const since = new Date(Date.now() - 60 * 86_400_000);
    expect(calls[0]).toMatchObject({
      where: { domain: "greenhouse.io" },
      orderBy: [{ seenCount: "desc" }, { lastSeenAt: "desc" }],
      take: 5,
    });
    const gte = calls[0]?.where?.lastSeenAt;
    expect(Math.abs((gte as { gte: Date }).gte.getTime() - since.getTime())).toBeLessThan(1000);
  });
});
