import { costByTaskType } from "./pilot.stats";
import { describe, expect, it } from "bun:test";

describe("costByTaskType", () => {
  const NOW = new Date("2026-08-30T12:00:00Z");

  const run = (taskType: string, inputTokens: number, outcome = "done") => ({
    taskType,
    outcome,
    inputTokens,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });

  const fakePrisma = (rows: ReturnType<typeof run>[]) => {
    const queries: { where: Record<string, unknown> }[] = [];
    const prisma = {
      pilotRun: {
        findMany: async (args: (typeof queries)[number]) => {
          queries.push(args);
          return rows;
        },
      },
    } as unknown as Parameters<typeof costByTaskType>[0];
    return { prisma, queries };
  };

  it("ranks task types by total tokens, not by how often they run", async () => {
    const { prisma } = fakePrisma([
      {
        ...run("job.apply", 50_000),
        outputTokens: 2000,
        cacheReadTokens: 6000,
        cacheWriteTokens: 2000,
      },
      run("job.apply", 30_000),
      // Runs three times as often but spends little, so it should rank below job.apply.
      run("inbox.review", 1000),
      run("inbox.review", 2000),
      run("inbox.review", 3000),
    ]);
    const rows = await costByTaskType(prisma, "u1", NOW);

    expect(rows.map((r) => r.taskType)).toEqual(["job.apply", "inbox.review"]);
    expect(rows[0]).toMatchObject({ runs: 2, medianTokens: 45_000, totalTokens: 90_000 });
    expect(rows[1]).toMatchObject({ runs: 3, medianTokens: 2000, totalTokens: 6000 });
  });

  it("counts failed and abandoned runs separately", async () => {
    const { prisma } = fakePrisma([
      run("search.discover", 100, "failed"),
      run("search.discover", 100, "expired"),
      run("search.discover", 100, "abandoned"),
      run("search.discover", 100),
    ]);
    const rows = await costByTaskType(prisma, "u1", NOW);

    expect(rows[0]).toMatchObject({ runs: 4, failed: 1, abandoned: 2 });
  });

  it("reads finished runs only", async () => {
    const { prisma, queries } = fakePrisma([]);
    await costByTaskType(prisma, "u1", NOW);

    expect(queries[0].where).toMatchObject({ finishedAt: { not: null } });
  });
});
