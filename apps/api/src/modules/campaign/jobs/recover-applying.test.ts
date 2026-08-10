// The one failure an employer can see: a crash between "form submitted" and "result recorded"
// used to re-approve the job, and the duplicate guard could not catch it because the Application
// row is written by the very call that never happened.
import {
  MAYBE_SUBMITTED_REASON,
  type RecoveryWriter,
  recoverApplyingJobs,
} from "./recover-applying";
import { describe, expect, it } from "bun:test";

interface Call {
  submitAttemptedAt: unknown;
  status: unknown;
  skipReason?: unknown;
}

function writer(matches: (where: Record<string, unknown>) => number): {
  db: RecoveryWriter;
  calls: Call[];
} {
  const calls: Call[] = [];
  const db = {
    job: {
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        calls.push({
          submitAttemptedAt: where.submitAttemptedAt,
          status: data.status,
          skipReason: data.skipReason,
        });
        return { count: matches(where) };
      },
    },
  };
  return { db: db as unknown as RecoveryWriter, calls };
}

describe("recoverApplyingJobs", () => {
  it("re-approves a job that never reached the submit", async () => {
    // Only the "submitAttemptedAt: null" branch matches anything.
    const { db, calls } = writer((w) => (w.submitAttemptedAt === null ? 1 : 0));

    const result = await recoverApplyingJobs(db, { status: "applying" });

    expect(result).toEqual({ reapproved: 1, parked: 0 });
    const reapprove = calls.find((c) => c.submitAttemptedAt === null);
    expect(reapprove?.status).toBe("approved");
  });

  it("parks a job that may already have been submitted, instead of retrying it", async () => {
    const { db, calls } = writer((w) => (w.submitAttemptedAt === null ? 0 : 1));

    const result = await recoverApplyingJobs(db, { status: "applying" });

    expect(result).toEqual({ reapproved: 0, parked: 1 });
    const parked = calls.find((c) => c.submitAttemptedAt !== null);
    expect(parked?.status).toBe("needs_user");
    expect(parked?.skipReason).toBe(MAYBE_SUBMITTED_REASON);
  });

  it("never sends a maybe-submitted job back to approved", async () => {
    const { db, calls } = writer(() => 1);

    await recoverApplyingJobs(db, { status: "applying" });

    // The stamped branch must never carry `approved` - that is the double-submit.
    const stamped = calls.filter((c) => c.submitAttemptedAt !== null);
    expect(stamped).toHaveLength(1);
    expect(stamped.every((c) => c.status !== "approved")).toBe(true);
  });

  it("keeps the caller's scope on both branches", async () => {
    const seen: Record<string, unknown>[] = [];
    const db = {
      job: {
        updateMany: async ({ where }: { where: Record<string, unknown> }) => {
          seen.push(where);
          return { count: 0 };
        },
      },
    } as unknown as RecoveryWriter;

    await recoverApplyingJobs(db, { status: "applying", campaign: { userId: "u1" } });

    expect(seen).toHaveLength(2);
    // A recovery that leaked past its user scope would touch another profile's jobs.
    expect(seen.every((w) => JSON.stringify(w.campaign) === JSON.stringify({ userId: "u1" }))).toBe(
      true,
    );
  });
});
