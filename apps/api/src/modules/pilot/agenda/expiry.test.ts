import type { PrismaClient } from "@/generated/prisma/client";
import { runExpiry } from "./expiry";
import { describe, expect, it } from "bun:test";

function setup(options: {
  claims?: Record<string, unknown>[];
  questions?: Record<string, unknown>[];
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
      findMany: async () => options.questions ?? [],
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
      // Crash recovery reads every interrupted job before parking it. One unstamped row by
      // default: that is the ordinary case, an apply cut off with nothing recorded.
      findMany: async () =>
        options.interruptedJobs ?? [
          {
            campaignId: "c1",
            key: "j1",
            title: "Engineer",
            company: "Acme",
            submitAttemptedAt: null,
          },
        ],
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
    // recorded how far it got.
    expect(state.jobWrites[0]).toMatchObject({
      where: { status: "applying", OR: [{ campaignId: "c1", key: "j1" }] },
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
    const sweep = state.jobWrites.find(
      (w) => (w.where as { status?: string }).status === "applying",
    );
    expect(sweep).toMatchObject({
      where: {
        status: "applying",
        NOT: [{ campaignId: "c1", key: "held" }],
        updatedAt: { lt: expect.any(Date) },
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
      stampedJobs: [
        { campaignId: "c1", key: "j1", title: "Director of Engineering", company: "Acme" },
      ],
    });

    await state.run();

    // The re-approve write must never carry a stamped job.
    const approved = state.jobWrites.filter(
      (w) => (w.data as Record<string, unknown>)?.status === "approved",
    );
    for (const write of approved) {
      expect((write.where as Record<string, unknown>).submitAttemptedAt).toBeNull();
    }
    const parked = state.jobWrites.find(
      (w) => (w.data as Record<string, unknown>)?.status === "needs_user",
    );
    expect(parked).toBeDefined();
    expect(state.questionWrites.some((q) => JSON.stringify(q).includes("Acme"))).toBe(true);
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
