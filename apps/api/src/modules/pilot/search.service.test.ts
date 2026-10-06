import { HOUR_MS } from "@/common/date/buckets";
import type { PrismaClient } from "@/generated/prisma/client";
import { PilotSearchService, type SearchCadence, scheduleNextRun } from "./search.service";
import { describe, expect, it } from "bun:test";

// A Wednesday, 08:00 in New York.
const NOW = new Date("2026-07-15T12:00:00.000Z");

const ADAPTIVE: SearchCadence = {
  cadence: "adaptive",
  cadenceDays: [],
  cadenceHour: 8,
  cadenceTimeZone: "UTC",
};
const MONDAYS: SearchCadence = {
  cadence: "weekly",
  cadenceDays: [1],
  cadenceHour: 8,
  cadenceTimeZone: "America/New_York",
};

describe("scheduleNextRun", () => {
  const cases: [
    name: string,
    emptyRuns: number,
    newJobs: number,
    reachedEnd: boolean,
    gapHours: number,
    nextEmptyRuns: number,
  ][] = [
    ["a good run on a yielding board re-runs in 2h and clears the streak", 2, 5, false, 2, 0],
    ["a good run that reached the board's end waits 8h", 0, 5, true, 8, 0],
    ["a thin run waits 8h", 0, 1, false, 8, 0],
    ["a first dry run waits 8h", 0, 0, false, 8, 1],
    ["a second dry run waits 24h", 1, 0, false, 24, 2],
    ["a third dry run waits 48h", 2, 0, false, 48, 3],
    ["the dry streak holds at 48h", 7, 0, false, 48, 8],
  ];

  for (const [name, emptyRuns, newJobs, reachedEnd, gapHours, nextEmptyRuns] of cases) {
    it(name, () => {
      const run = { jobsSeen: 20, newJobs, reachedEnd };
      const next = scheduleNextRun(emptyRuns, ADAPTIVE, run, NOW);
      expect((next.nextRunAt.getTime() - NOW.getTime()) / HOUR_MS).toBe(gapHours);
      expect(next.emptyRuns).toBe(nextEmptyRuns);
      expect(next).toMatchObject({ lastRunAt: NOW, lastJobsSeen: 20, lastNewJobs: newJobs });
    });
  }
});

describe("scheduleNextRun under a weekly pin", () => {
  const weekly = (newJobs: number, cadence = MONDAYS) =>
    scheduleNextRun(2, cadence, { jobsSeen: 20, newJobs, reachedEnd: false }, NOW);

  it("goes to the next pinned day whatever the yield", () => {
    expect(weekly(0).nextRunAt.toISOString()).toBe("2026-07-20T12:00:00.000Z");
    expect(weekly(9).nextRunAt.toISOString()).toBe("2026-07-20T12:00:00.000Z");
  });

  it("still counts empty runs, so the UI can show a pinned search coming up dry", () => {
    expect(weekly(0).emptyRuns).toBe(3);
  });

  it("falls back to the ladder when every day was removed", () => {
    const next = weekly(9, { ...MONDAYS, cadenceDays: [] });
    expect((next.nextRunAt.getTime() - NOW.getTime()) / HOUR_MS).toBe(2);
  });
});

interface SearchRows {
  existing?: Record<string, unknown> | null;
  clash?: { id: string } | null;
}

function makeService(over: SearchRows = {}) {
  const rec = {
    creates: [] as Record<string, unknown>[],
    updates: [] as Record<string, unknown>[],
    adoptions: [] as { where: Record<string, unknown> }[],
    taskListResets: 0,
  };
  const db = {
    pilotSearch: {
      // A `query` in the where marks the uniqueness probe; otherwise it is the ownership load.
      findFirst: async (a: { where: { query?: string } }) =>
        a.where.query === undefined ? (over.existing ?? null) : (over.clash ?? null),
      create: async (a: { data: Record<string, unknown> }) => {
        rec.creates.push(a.data);
        return { id: "new", ...a.data };
      },
      update: async (a: { data: Record<string, unknown> }) => {
        rec.updates.push(a.data);
        return { id: "s1", ...over.existing, ...a.data };
      },
    },
    campaign: {
      updateMany: async (a: { where: Record<string, unknown> }) => {
        rec.adoptions.push(a);
        return { count: 1 };
      },
    },
    pilotState: {
      updateMany: async () => {
        rec.taskListResets++;
        return { count: 1 };
      },
    },
  };
  return { svc: new PilotSearchService(db as unknown as PrismaClient), rec };
}

describe("PilotSearchService", () => {
  const existing = { id: "s1", query: "react", board: null, emptyRuns: 0, ...ADAPTIVE };

  it("creates a search and clears the cached task list", async () => {
    const { svc, rec } = makeService();
    await svc.create("p1", { ...ADAPTIVE, query: "react", reason: "core stack" });
    expect(rec.creates[0]).toMatchObject({ userId: "p1", query: "react", board: null });
    expect(rec.taskListResets).toBe(1);
  });

  it("rejects a duplicate query and board, on create and on edit", async () => {
    const created = makeService({ clash: { id: "dupe" } });
    await expect(
      created.svc.create("p1", { ...ADAPTIVE, query: "react", reason: "" }),
    ).rejects.toMatchObject({
      status: 409,
    });
    const edited = makeService({ existing, clash: { id: "dupe" } });
    await expect(edited.svc.update("p1", "s1", { query: "golang" })).rejects.toMatchObject({
      status: 409,
    });
  });

  it("restarts the schedule for a new query, but not for a new reason", async () => {
    const requeried = makeService({ existing });
    await requeried.svc.update("p1", "s1", { query: "golang" });
    expect(requeried.rec.updates[0]).toMatchObject({
      query: "golang",
      emptyRuns: 0,
      nextRunAt: expect.any(Date),
      lastJobsSeen: null,
      lastNewJobs: null,
    });

    const reworded = makeService({ existing });
    await reworded.svc.update("p1", "s1", { reason: "still my top pick" });
    expect(reworded.rec.updates[0]).toEqual({ reason: "still my top pick" });
  });

  it("404s an unknown search", async () => {
    const { svc } = makeService({ existing: null });
    await expect(svc.update("p1", "missing", { reason: "x" })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("applies a run report to the schedule and clears the cached task list", async () => {
    const { svc, rec } = makeService({ existing });
    await svc.reportRun("p1", "s1", { jobsSeen: 30, newJobs: 5, reachedEnd: false });
    expect(rec.updates[0]).toMatchObject({ emptyRuns: 0, lastJobsSeen: 30, lastNewJobs: 5 });
    expect(rec.taskListResets).toBe(1);
  });
});

describe("PilotSearchService weekly scheduling", () => {
  const pinned = { id: "s1", query: "cto", board: null, emptyRuns: 0, ...MONDAYS };
  const adaptive = { ...pinned, ...ADAPTIVE };

  it("waits for the first pinned day rather than running the moment it is saved", async () => {
    const { svc, rec } = makeService();
    await svc.create("p1", { ...MONDAYS, query: "cto", reason: "" });
    const nextRunAt = rec.creates[0].nextRunAt as Date;
    expect(nextRunAt.getUTCDay()).toBe(1);
    expect(nextRunAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("leaves an adaptive search due at once", async () => {
    const { svc, rec } = makeService();
    await svc.create("p1", { ...ADAPTIVE, query: "cto", reason: "" });
    expect(rec.creates[0].nextRunAt).toBeUndefined();
  });

  it("links the campaign it repeats, only if that campaign is the user's and unlinked", async () => {
    const { svc, rec } = makeService();
    await svc.create("p1", {
      ...MONDAYS,
      query: "cto",
      reason: "",
      campaignId: crypto.randomUUID(),
    });
    expect(rec.adoptions[0].where).toMatchObject({ userId: "p1", pilotSearchId: null });
  });

  it("re-aims the next run when the schedule is edited", async () => {
    const { svc, rec } = makeService({ existing: adaptive });
    await svc.update("p1", "s1", { cadence: "weekly", cadenceDays: [4] });
    expect((rec.updates[0].nextRunAt as Date).getUTCDay()).toBe(4);
  });

  it("keeps a pinned search on its day when the reason or query changes", async () => {
    const reworded = makeService({ existing: pinned });
    await reworded.svc.update("p1", "s1", { reason: "clearer why" });
    expect(reworded.rec.updates[0].nextRunAt).toBeUndefined();

    const requeried = makeService({ existing: pinned });
    await requeried.svc.update("p1", "s1", { query: "cio" });
    expect(requeried.rec.updates[0]).toMatchObject({ emptyRuns: 0 });
    expect(requeried.rec.updates[0].nextRunAt).toBeUndefined();
  });

  it("carries the search's own threshold and cap", async () => {
    const { svc, rec } = makeService();
    await svc.create("p1", {
      ...ADAPTIVE,
      query: "cto",
      reason: "",
      minScore: 72,
      maxApplications: 5,
    });
    expect(rec.creates[0]).toMatchObject({ minScore: 72, maxApplications: 5 });
  });

  it("schedules a reported run against the row's own cadence", async () => {
    const { svc, rec } = makeService({ existing: pinned });
    await svc.reportRun("p1", "s1", { jobsSeen: 40, newJobs: 9, reachedEnd: false });
    expect((rec.updates[0].nextRunAt as Date).getUTCDay()).toBe(1);
  });
});
