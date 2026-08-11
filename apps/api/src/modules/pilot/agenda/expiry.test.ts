import { MAYBE_SUBMITTED_REASON } from "@jobpilot/contracts/campaign";
import type { PrismaClient } from "@/generated/prisma/client";
import { runExpiry } from "./expiry";
import { describe, expect, it } from "bun:test";

function setup(options: {
  claims?: Record<string, unknown>[];
  /** Questions the expiry scan finds lapsed. */
  questions?: Record<string, unknown>[];
  /** Questions already open against a parked job, which recovery must not duplicate. */
  openQuestions?: Record<string, unknown>[];
  openApplyClaims?: Record<string, unknown>[];
  /** Rows recovery finds in `applying`; it parks all of them, stamped or not. */
  interruptedJobs?: Record<string, unknown>[];
}) {
  const jobWrites: Record<string, unknown>[] = [];
  const claimWrites: Record<string, unknown>[] = [];
  const questionWrites: Record<string, unknown>[] = [];
  let transactions = 0;
  const db = {
    pilotClaim: {
      // The expired-claim scan has no kind filter; the stale-applying sweep reads open job.apply claims.
      findMany: async (args: { where: { kind?: string } }) =>
        args.where.kind === "job.apply" ? (options.openApplyClaims ?? []) : (options.claims ?? []),
      updateMany: async (args: Record<string, unknown>) => {
        claimWrites.push(args);
        return { count: options.claims?.length ?? 0 };
      },
    },
    pilotQuestion: {
      // Two callers: recovery's dedupe lookup (by subjectId) and the expiry scan. Returning the
      // expiring fixture to both would read as "already asked" and suppress every new question.
      findMany: async (args: { where: Record<string, unknown> }) =>
        args.where.subjectId ? (options.openQuestions ?? []) : (options.questions ?? []),
      // Recovery raises one per parked job so the user hears about it.
      create: async (args: { data: Record<string, unknown> }) => {
        questionWrites.push(args.data);
        return args.data;
      },
      updateMany: async (args: Record<string, unknown>) => {
        questionWrites.push(args);
        return { count: options.questions?.length ?? 0 };
      },
    },
    job: {
      // Crash recovery reads every interrupted job, then re-reads what it actually parked. One
      // unstamped row by default: the ordinary case, an apply cut off with nothing recorded.
      findMany: async (args: { where: Record<string, unknown> }) => {
        const rows = options.interruptedJobs ?? [
          {
            campaignId: "c1",
            key: "j1",
            title: "Engineer",
            company: "Acme",
            submitAttemptedAt: null,
          },
        ];
        // The re-read only sees rows a write moved to needs_user; without this the fake would
        // report a question for every row regardless of whether parking succeeded.
        if (args.where.status === "needs_user") {
          return jobWrites.some((w) => (w.data as { status?: string }).status === "needs_user")
            ? rows
            : [];
        }
        return rows;
      },
      updateMany: async (args: Record<string, unknown>) => {
        jobWrites.push(args);
        return { count: 1 };
      },
    },
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => {
      transactions += 1;
      return work(db);
    },
  };
  const run = () => runExpiry(db as unknown as PrismaClient, "u1", new Date());
  return {
    run,
    jobWrites,
    claimWrites,
    questionWrites,
    get transactions() {
      return transactions;
    },
  };
}

describe("agenda expiry", () => {
  it("releases an expired claim and parks its applying job in one transaction", async () => {
    const state = setup({
      claims: [
        {
          id: "l1",
          kind: "job.apply",
          subjectId: "j1",
          payload: { campaignId: "c1", jobKey: "j1" },
        },
      ],
    });
    await state.run();
    expect(state.transactions).toBe(1);
    expect(state.claimWrites[0]).toMatchObject({ data: { outcome: "expired" } });
    // Parked, not re-approved: an interrupted apply may already be with the employer, and nothing
    // recorded how far it got. The write is scoped to the rows recovery actually read.
    expect(state.jobWrites[0]).toMatchObject({
      where: {
        AND: [
          { status: "applying", OR: [{ campaignId: "c1", key: "j1" }] },
          { OR: [{ campaignId: "c1", key: "j1" }] },
        ],
      },
      data: { status: "needs_user" },
    });
    expect(
      state.jobWrites.every((w) => (w.data as { status?: string }).status !== "approved"),
    ).toBe(true);
  });

  it("expires a question and skips its parked job atomically", async () => {
    const state = setup({
      questions: [{ id: "q1", subjectType: "job", subjectId: "c1:j1" }],
    });
    await state.run();
    expect(state.transactions).toBe(1);
    // The array also holds questions recovery *creates*, so match the expiry update itself.
    const expired = state.questionWrites.find(
      (w) => (w as { data?: { status?: string } }).data?.status === "expired",
    );
    expect(expired).toBeDefined();
    const skip = state.jobWrites.find((w) => (w.data as { status?: string }).status === "skipped");
    expect(skip).toMatchObject({ data: { status: "skipped" } });
  });

  it("parks stale applying jobs while sparing ones under an open apply claim", async () => {
    const state = setup({
      openApplyClaims: [{ payload: { campaignId: "c1", jobKey: "held" } }],
    });
    await state.run();
    const sweep = state.jobWrites.find((w) =>
      JSON.stringify((w.where as Record<string, unknown>).AND).includes("held"),
    );
    expect(sweep).toBeDefined();
    expect(sweep).toMatchObject({
      where: {
        AND: [
          {
            status: "applying",
            NOT: [{ campaignId: "c1", key: "held" }],
            updatedAt: { lt: expect.any(Date) },
          },
          { OR: expect.any(Array) },
        ],
      },
      data: { status: "needs_user" },
    });
  });
});

describe("agenda expiry - maybe-submitted jobs", () => {
  it("parks a stamped job and asks the user instead of re-approving it", async () => {
    const state = setup({
      claims: [
        {
          id: "cl1",
          kind: "job.apply",
          subjectId: "j1",
          payload: { campaignId: "c1", jobKey: "j1" },
        },
      ],
      interruptedJobs: [
        {
          campaignId: "c1",
          key: "j1",
          title: "Director of Engineering",
          company: "Initech",
          submitAttemptedAt: new Date("2026-08-10T12:00:00Z"),
        },
      ],
    });

    await state.run();

    expect(
      state.jobWrites.every((w) => (w.data as { status?: string }).status !== "approved"),
    ).toBe(true);
    const parked = state.jobWrites.find(
      (w) => (w.data as { status?: string }).status === "needs_user",
    );
    expect(parked?.data).toMatchObject({ skipReason: MAYBE_SUBMITTED_REASON });
    // Company comes from the fixture, not the default row, so the assertion tracks this job.
    expect(state.questionWrites.some((q) => JSON.stringify(q).includes("Initech"))).toBe(true);
  });

  it("asks nothing when the job already has an open question against it", async () => {
    const state = setup({
      claims: [
        {
          id: "cl1",
          kind: "job.apply",
          subjectId: "j1",
          payload: { campaignId: "c1", jobKey: "j1" },
        },
      ],
      openQuestions: [{ subjectId: "c1:j1" }],
    });

    await state.run();

    expect(state.questionWrites.some((q) => q.kind === "choice")).toBe(false);
  });

  // The caller publishes these; a question only in the database never reaches the user, and the
  // parked job then keeps its campaign in progress with nothing to show for it.
  it("returns the questions it raised so the caller can publish them", async () => {
    const state = setup({
      claims: [
        {
          id: "cl1",
          kind: "job.apply",
          subjectId: "j1",
          payload: { campaignId: "c1", jobKey: "j1" },
        },
      ],
    });

    const result = await state.run();

    expect(result.recoveryQuestions.length).toBeGreaterThan(0);
  });
});

describe("agenda expiry - jobs lost to an unanswered question", () => {
  it("reports how many jobs a lapsed question dropped, so the user can be told", async () => {
    const state = setup({
      questions: [{ id: "q1", subjectType: "job", subjectId: "c1:j1" }],
    });

    const result = await state.run();

    // 52 jobs were dropped this way on the live data, every one of them silently.
    expect(result.jobsDroppedByExpiredQuestion).toBe(1);
  });

  it("reports zero when nothing expired, so no notification fires", async () => {
    const state = setup({});

    expect((await state.run()).jobsDroppedByExpiredQuestion).toBe(0);
  });
});
