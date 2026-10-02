import { costByTaskType } from "./pilot.stats";
import { describe, expect, it } from "bun:test";

describe("costByTaskType", () => {
  const NOW = new Date("2026-08-30T12:00:00Z");
  const at = (minutesAgo: number) => new Date(NOW.getTime() - minutesAgo * 60_000);

  const runs = (rows: Record<string, unknown>[]) =>
    ({ pilotRun: { findMany: async () => rows } }) as unknown as Parameters<
      typeof costByTaskType
    >[0];

  it("ranks task types by total time, not by how often they run", async () => {
    const rows = await costByTaskType(
      runs([
        { taskType: "job.apply", startedAt: at(30), finishedAt: at(20), outcome: "done" },
        { taskType: "job.apply", startedAt: at(60), finishedAt: at(40), outcome: "done" },
        // Runs three times as often but finishes in a minute, so it should rank below job.apply.
        { taskType: "inbox.review", startedAt: at(10), finishedAt: at(9), outcome: "done" },
        { taskType: "inbox.review", startedAt: at(12), finishedAt: at(11), outcome: "done" },
        { taskType: "inbox.review", startedAt: at(14), finishedAt: at(13), outcome: "done" },
      ]),
      "u1",
      NOW,
    );

    expect(rows.map((r) => r.taskType)).toEqual(["job.apply", "inbox.review"]);
    expect(rows[0]).toMatchObject({ runs: 2, medianMs: 15 * 60_000, totalMs: 30 * 60_000 });
    expect(rows[1]).toMatchObject({ runs: 3, medianMs: 60_000 });
  });

  it("counts failed and abandoned runs separately", async () => {
    const rows = await costByTaskType(
      runs([
        { taskType: "search.discover", startedAt: at(30), finishedAt: at(25), outcome: "failed" },
        { taskType: "search.discover", startedAt: at(20), finishedAt: at(15), outcome: "expired" },
        { taskType: "search.discover", startedAt: at(10), finishedAt: at(5), outcome: "abandoned" },
        { taskType: "search.discover", startedAt: at(4), finishedAt: at(1), outcome: "done" },
      ]),
      "u1",
      NOW,
    );

    expect(rows[0]).toMatchObject({ runs: 4, failed: 1, abandoned: 2 });
  });

  it("ignores a run still running, which has no duration yet", async () => {
    const rows = await costByTaskType(
      runs([{ taskType: "job.apply", startedAt: at(5), finishedAt: null, outcome: null }]),
      "u1",
      NOW,
    );

    expect(rows).toEqual([]);
  });
});
