import type { PrismaClient } from "@/generated/prisma/client";
import { JobListingService } from "./job-listing.service";
import { describe, expect, it } from "bun:test";

interface Row {
  id: string;
  skills: string[];
  boards: (string | null)[];
}

/** Only the SUMMARY_SELECT fields the service reshapes. */
const summary = (row: Row) => ({
  id: row.id,
  slug: row.id,
  skills: row.skills,
  sources: row.boards.map((board) => ({ board })),
});

interface ListingFields {
  id: string;
  skills: string[];
  title?: string;
}

interface FakeOptions {
  listing?: ListingFields | null;
  rows?: Row[];
  /** What the similar-listings ranking query returns, best match first. */
  rankedIds?: string[];
}

function fakePrisma(options: FakeOptions = {}) {
  const findManyArgs: Record<string, unknown>[] = [];
  const rankingValues: unknown[][] = [];
  const prisma = {
    jobListing: {
      findFirst: async () =>
        options.listing
          ? { title: "Engineer", remote: true, location: "Austin, TX", ...options.listing }
          : null,
      findMany: async (args: Record<string, unknown>) => {
        findManyArgs.push(args);
        return (options.rows ?? []).map(summary);
      },
      count: async () => options.rows?.length ?? 0,
    },
    jobBoard: {
      findMany: async () => [{ domain: "linkedin.com", name: "LinkedIn" }],
    },
    $queryRaw: async (sql: TemplateStringsArray, ...values: unknown[]) => {
      if (sql.join("").includes("cardinality")) {
        rankingValues.push(values);
        return (options.rankedIds ?? []).map((id) => ({ id }));
      }
      return [
        { skill: "React", count: 3 },
        { skill: "react", count: 1 },
      ];
    },
  };
  return {
    service: new JobListingService(prisma as unknown as PrismaClient),
    findManyArgs,
    rankingValues,
  };
}

describe("JobListingService.list", () => {
  it("names each listing's distinct boards instead of counting its source links", async () => {
    const { service } = fakePrisma({
      rows: [
        { id: "l1", skills: [], boards: ["linkedin.com", "linkedin.com", "naukri.com", null] },
      ],
    });

    const page = await service.list({ page: 1, limit: 24 });

    expect(page.items[0]).toMatchObject({ sourceCount: 4, boards: ["LinkedIn", "naukri.com"] });
    expect(page.items[0]).not.toHaveProperty("sources");
  });

  it("sorts by first sighting for `newest` and by last sighting by default", async () => {
    const { service, findManyArgs } = fakePrisma();

    await service.list({ page: 1, limit: 24 });
    await service.list({ page: 1, limit: 24, sort: "newest" });

    expect(findManyArgs.map((args) => args.orderBy)).toEqual([
      { lastSeenAt: "desc" },
      { firstSeenAt: "desc" },
    ]);
  });

  it("limits `posted` to listings first seen inside the window", async () => {
    const { service, findManyArgs } = fakePrisma();
    const before = Date.now();

    await service.list({ page: 1, limit: 24, posted: "7d" });

    const where = findManyArgs[0].where as { firstSeenAt: { gte: Date }; status: string };
    const sevenDays = 7 * 24 * 60 * 60_000;
    expect(where.status).toBe("published");
    expect(where.firstSeenAt.gte.getTime()).toBeGreaterThanOrEqual(before - sevenDays);
    expect(where.firstSeenAt.gte.getTime()).toBeLessThanOrEqual(Date.now() - sevenDays);
  });
});

describe("JobListingService.similar", () => {
  it("ranks other listings by the listing's skills, matching every stored casing", async () => {
    const { service, rankingValues } = fakePrisma({ listing: { id: "self", skills: ["react"] } });

    await service.similar("self");

    const [selfId, candidateSkills] = rankingValues[0];
    expect(selfId).toBe("self");
    expect(candidateSkills).toEqual(["React", "react"]);
    expect(rankingValues[0]).toContainEqual(["react"]);
    expect(rankingValues[0].at(-1)).toBe(6);
  });

  it("scores the listing's title words and remote flag alongside its skills", async () => {
    const { service, rankingValues } = fakePrisma({
      listing: { id: "self", skills: ["Go"], title: "Senior Go Engineer (Remote)" },
    });

    await service.similar("self");

    expect(rankingValues[0]).toContainEqual(["senior", "go", "engineer"]);
    expect(rankingValues[0]).toContain(true);
  });

  it("keeps the ranked order and names each listing's boards", async () => {
    const { service, findManyArgs } = fakePrisma({
      listing: { id: "self", skills: ["Go"] },
      rankedIds: ["best", "next"],
      rows: [
        { id: "next", skills: ["Go"], boards: [] },
        { id: "best", skills: ["Go"], boards: ["linkedin.com", "linkedin.com"] },
      ],
    });

    const similar = await service.similar("self");

    expect(findManyArgs[0]).toMatchObject({
      where: { id: { in: ["best", "next"] }, status: "published" },
    });
    expect(similar.map((job) => job.id)).toEqual(["best", "next"]);
    expect(similar[0]).toMatchObject({ boards: ["LinkedIn"], sourceCount: 2 });
  });

  it("reuses the ranking for the same listing but re-reads the rows", async () => {
    const { service, rankingValues, findManyArgs } = fakePrisma({
      listing: { id: "self", skills: ["Go"] },
      rankedIds: ["best"],
      rows: [{ id: "best", skills: ["Go"], boards: [] }],
    });

    await service.similar("self");
    await service.similar("self");

    expect(rankingValues).toHaveLength(1);
    expect(findManyArgs).toHaveLength(2);
  });

  it("skips the search when the listing has no skills to match on", async () => {
    const { service, rankingValues } = fakePrisma({ listing: { id: "self", skills: [] } });

    expect(await service.similar("self")).toEqual([]);
    expect(rankingValues).toHaveLength(0);
  });

  it("404s for a slug that is not a published listing", async () => {
    const { service } = fakePrisma({ listing: null });

    await expect(service.similar("gone")).rejects.toMatchObject({ status: 404 });
  });
});
