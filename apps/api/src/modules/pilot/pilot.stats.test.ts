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

  const fakePrisma = (rows: ReturnType<typeof run>[]) =>
    ({ pilotRun: { findMany: async () => rows } }) as unknown as Parameters<
      typeof costByTaskType
    >[0];

  it("ranks task types by new tokens, not by how often they run or by cache reads", async () => {
    const prisma = fakePrisma([
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
      // Cache reads dwarf everything else here, yet they are cheap and must not move the ranking.
      { ...run("queue.score", 100), cacheReadTokens: 5_000_000 },
    ]);
    const rows = await costByTaskType(prisma, "u1", NOW);

    expect(rows.map((r) => r.taskType)).toEqual(["job.apply", "inbox.review", "queue.score"]);
    expect(rows[0]).toMatchObject({
      runs: 2,
      medianNewTokens: 42_000,
      tokens: { input: 80_000, output: 2000, cacheRead: 6000, cacheWrite: 2000 },
    });
    expect(rows[1]).toMatchObject({
      runs: 3,
      medianNewTokens: 2000,
      tokens: { input: 6000, output: 0, cacheRead: 0, cacheWrite: 0 },
    });
    expect(rows[2]).toMatchObject({ medianNewTokens: 100 });
  });

  it("counts failed and unfinished runs separately", async () => {
    const prisma = fakePrisma([
      run("search.discover", 100, "failed"),
      run("search.discover", 100, "expired"),
      run("search.discover", 100, "cancelled"),
      run("search.discover", 100),
    ]);
    const rows = await costByTaskType(prisma, "u1", NOW);

    expect(rows[0]).toMatchObject({ runs: 4, failed: 1, unfinished: 2 });
  });
});
