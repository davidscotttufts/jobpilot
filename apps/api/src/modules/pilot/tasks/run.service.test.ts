import type { CreatePilotJournalInput, PilotTask, TaskList } from "@jobpilot/contracts/pilot";
import { pilotChannel } from "@jobpilot/contracts/sse";
import { subscribe } from "@/common/sse/server";
import type { PrismaClient } from "@/generated/prisma/client";
import type { PilotJournalService } from "../journal.service";
import { SiteHintService } from "../site-hint.service";
import { RunService } from "./run.service";
import { describe, expect, it } from "bun:test";

const USER_ID = "5f0d4d0e-4f27-4a0a-9f4e-2b1c6f1f7f01";
const RUN_ID = "4c965efd-b586-49ea-825b-1af715760116";
const VERSION = "31b0c512-b767-4dd7-9ee8-913e46d544c6";
const now = new Date();

const applyTask: PilotTask = {
  id: "job.apply:c1:j1",
  taskType: "job.apply",
  priority: 100,
  title: "Engineer",
  subjectType: "job",
  subjectId: "c1:j1",
  payload: {
    campaignId: "c1",
    jobKey: "j1",
    url: "https://example.test/job",
    board: null,
    brief: null,
    matchScore: 90,
  },
};

const pausedTask: PilotTask = {
  id: "campaign.reviewPaused:c9",
  taskType: "campaign.reviewPaused",
  priority: 910,
  title: "Review paused campaign: react",
  subjectType: "campaign",
  subjectId: "c9",
  payload: { campaignId: "c9", query: "react", board: null, pausedAt: now },
};

const snapshot: TaskList = {
  version: VERSION,
  builtAt: now,
  expiresAt: new Date(now.getTime() + 60_000),
  tasks: [applyTask, pausedTask],
  counts: { openQuestions: 0, activeRuns: 0, approvedJobs: 1, appliedToday: 0 },
  budget: {
    dailyApplyCap: 10,
    appliedToday: 0,
    capReached: false,
    dailyNetworkingCap: 5,
    networkingSentToday: 0,
    resetsAt: now,
  },
  emptyReason: null,
  sleepSeconds: 15,
  nextWakeAt: new Date(now.getTime() + 15_000),
};

function fakeJournal() {
  const appended: CreatePilotJournalInput[] = [];
  const journal = {
    appendJournal: async (_userId: string, body: CreatePilotJournalInput) => appended.push(body),
  } as unknown as PilotJournalService;
  return { journal, appended };
}

function makeRunService(db: unknown, journal = fakeJournal().journal) {
  const prisma = db as PrismaClient;
  return new RunService(prisma, journal, new SiteHintService(prisma));
}

interface RunSetup {
  currentVersion?: string;
  openRun?: { id: string } | null;
  campaignStillPaused?: boolean;
}

function runDb({ currentVersion = VERSION, openRun = null, campaignStillPaused = true }: RunSetup) {
  const creates: Record<string, unknown>[] = [];
  const db = {
    pilotState: {
      updateManyAndReturn: async (a: { where: { taskListVersion: string } }) =>
        a.where.taskListVersion === currentVersion ? [{ taskListSnapshot: snapshot }] : [],
      findUnique: async () => ({ running: true }),
    },
    pilotRun: {
      findFirst: async () => openRun,
      create: async (a: { data: Record<string, unknown> }) => {
        creates.push(a.data);
        return {
          id: RUN_ID,
          userId: USER_ID,
          startedAt: now,
          heartbeatAt: null,
          finishedAt: null,
          outcome: null,
          ...a.data,
        };
      },
    },
    campaign: { count: async () => (campaignStillPaused ? 1 : 0) },
    // What `startApplying` reads and writes; no duplicate matches.
    job: {
      findFirst: async () => ({
        url: "https://example.test/job",
        title: "Engineer",
        company: "Acme",
      }),
      findMany: async () => [],
      updateManyAndReturn: async () => [{ campaignId: "c1", key: "j1", status: "applying" }],
    },
    application: { findUnique: async () => null, findMany: async () => [] },
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
  };
  return { service: makeRunService(db), creates };
}

describe("RunService.start", () => {
  it("starts a task off the supplied snapshot and stores its payload", async () => {
    const { service, creates } = runDb({});
    const run = await service.start(USER_ID, VERSION, applyTask.id);
    expect(creates[0]).toMatchObject({ taskType: "job.apply", subjectId: "c1:j1" });
    expect(run.payload).toMatchObject({ campaignId: "c1", jobKey: "j1" });
  });

  it("refuses a stale snapshot, a held subject, or a row that changed since the build", async () => {
    const refusals: [RunSetup, string, string][] = [
      [{ currentVersion: "d6579e89-e9af-4f83-a04e-7d2cfad07cf3" }, applyTask.id, "stale"],
      [{ openRun: { id: "held" } }, applyTask.id, "already started"],
      [{ campaignStillPaused: false }, pausedTask.id, "no longer paused"],
    ];
    for (const [setup, taskId, message] of refusals) {
      const { service, creates } = runDb(setup);
      await expect(service.start(USER_ID, VERSION, taskId)).rejects.toThrow(message);
      expect(creates).toHaveLength(0);
    }
  });
});

describe("RunService.heartbeat", () => {
  const heartbeat = async (startedMinutesAgo: number) => {
    const startedAt = new Date(Date.now() - startedMinutesAgo * 60_000);
    let expiresAt = new Date(0);
    const db = {
      pilotRun: {
        findFirst: async () => ({ startedAt, finishedAt: null }),
        updateManyAndReturn: async (a: { data: { expiresAt: Date } }) => {
          expiresAt = a.data.expiresAt;
          const { taskType, subjectType, subjectId, payload } = applyTask;
          const run = { id: RUN_ID, userId: USER_ID, taskType, subjectType, subjectId, payload };
          return [
            {
              ...run,
              startedAt,
              heartbeatAt: new Date(),
              expiresAt,
              finishedAt: null,
              outcome: null,
            },
          ];
        },
      },
    };
    await makeRunService(db).heartbeat(USER_ID, RUN_ID);
    return (expiresAt.getTime() - Date.now()) / 60_000;
  };

  it("extends a young run by the full TTL", async () => {
    const minutesLeft = await heartbeat(1);
    expect(minutesLeft).toBeGreaterThan(14);
    expect(minutesLeft).toBeLessThanOrEqual(15);
  });

  it("holds a long-running run to its lifetime ceiling, even past it", async () => {
    const nearCeiling = await heartbeat(20);
    expect(nearCeiling).toBeGreaterThan(4);
    expect(nearCeiling).toBeLessThanOrEqual(5);
    expect(await heartbeat(90)).toBeLessThan(0);
  });
});

describe("RunService.reportUsage", () => {
  it("sets the measured usage on the run", async () => {
    const usage = {
      model: "claude-opus-5-5",
      inputTokens: 1200,
      outputTokens: 300,
      cacheReadTokens: 40_000,
      cacheWriteTokens: 2000,
    };
    const { taskType, subjectType, subjectId, payload } = applyTask;
    const row = {
      ...{ id: RUN_ID, userId: USER_ID, taskType, subjectType, subjectId, payload },
      ...{ startedAt: now, heartbeatAt: null, expiresAt: now, finishedAt: null, outcome: null },
    };
    const updates: unknown[] = [];
    const db = {
      pilotRun: {
        findFirst: async () => ({ id: RUN_ID }),
        update: async (args: { data: typeof usage }) => {
          updates.push(args);
          return { ...row, ...args.data };
        },
      },
    };

    await makeRunService(db).reportUsage(USER_ID, RUN_ID, usage);

    expect(updates).toEqual([{ where: { id: RUN_ID }, data: usage }]);
  });
});

describe("RunService.postResult", () => {
  const result = {
    outcome: "done" as const,
    summary: "Applied to Engineer at Acme",
    hints: [{ domain: "WWW.Example.test", text: "Login wall after three pages" }],
  };

  const post = async (userId: string, finishedAt: Date | null) => {
    const { taskType, subjectType, subjectId, payload } = applyTask;
    const fields = { id: RUN_ID, userId, taskType, subjectType, subjectId, payload };
    const row = {
      ...fields,
      startedAt: now,
      heartbeatAt: null,
      expiresAt: now,
      finishedAt,
      outcome: null,
    };
    const upserts: unknown[] = [];
    const db = {
      pilotRun: {
        findFirst: async () => row,
        updateManyAndReturn: async (a: { data: Record<string, unknown> }) => [
          { ...row, ...a.data },
        ],
      },
      siteHint: { upsert: async (args: unknown) => upserts.push(args) },
      $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
    };
    const { journal, appended } = fakeJournal();
    const run = await makeRunService(db, journal).postResult(userId, RUN_ID, result);
    return { run, appended, upserts };
  };

  it("journals the action and hints under the run id, finishes the run, and publishes", async () => {
    const userId = crypto.randomUUID();
    const stream = subscribe(pilotChannel, { userId });
    await stream.next();
    const { run, appended } = await post(userId, null);

    expect(run.outcome).toBe("done");
    expect(appended).toEqual([
      {
        cycleId: RUN_ID,
        entries: [
          { kind: "action", summary: result.summary, subjectType: "job", subjectId: "c1:j1" },
          {
            kind: "hint",
            summary: result.hints[0].text,
            subjectType: "board",
            subjectId: "WWW.Example.test",
          },
        ],
      },
    ]);
    const frame = (await stream.next()).value as unknown as { data: unknown };
    expect(frame.data).toEqual({ type: "run.finished", runId: RUN_ID, outcome: "done" });
    await stream.return();
  });

  it("counts each hint once more under its normalized domain", async () => {
    const { upserts } = await post(USER_ID, null);
    const key = { domain: "example.test", hint: result.hints[0].text };
    expect(upserts).toEqual([
      {
        where: { domain_hint: key },
        create: key,
        update: { seenCount: { increment: 1 }, lastSeenAt: expect.any(Date) },
      },
    ]);
  });

  it("returns a finished run unchanged and journals nothing", async () => {
    const { run, appended, upserts } = await post(USER_ID, now);
    expect(run.finishedAt).toEqual(now);
    expect(appended).toHaveLength(0);
    expect(upserts).toHaveLength(0);
  });
});
