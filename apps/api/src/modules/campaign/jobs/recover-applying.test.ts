// The one failure an employer can see: a crash between "form submitted" and "result recorded"
// used to re-approve the job, and the duplicate guard could not catch it because the Application
// row is written by the very call that never happened.
import {
  MAYBE_SUBMITTED_REASON,
  type RecoveryWriter,
  recoverApplyingJobs,
} from "./recover-applying";
import { describe, expect, it } from "bun:test";

const STAMPED = [
  { campaignId: "c1", key: "j1", title: "Director of Engineering", company: "Acme" },
];

interface Harness {
  db: RecoveryWriter;
  updates: Array<{ stamped: boolean; status: unknown; skipReason?: unknown }>;
  questions: Array<Record<string, unknown>>;
}

function harness(stamped: typeof STAMPED): Harness {
  const updates: Harness["updates"] = [];
  const questions: Harness["questions"] = [];
  const db = {
    job: {
      findMany: async () => stamped,
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const isStamped = where.submitAttemptedAt !== null;
        updates.push({ stamped: isStamped, status: data.status, skipReason: data.skipReason });
        return { count: isStamped ? stamped.length : 1 };
      },
    },
    pilotQuestion: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        questions.push(data);
        return data;
      },
    },
  };
  return { db: db as unknown as RecoveryWriter, updates, questions };
}

describe("recoverApplyingJobs", () => {
  it("re-approves a job that never reached the submit", async () => {
    const h = harness([]);

    const result = await recoverApplyingJobs(h.db, "u1", { status: "applying" });

    expect(result).toEqual({ reapproved: 1, parked: 0 });
    expect(h.updates.find((u) => !u.stamped)?.status).toBe("approved");
    expect(h.questions).toHaveLength(0);
  });

  it("parks a job that may already have been submitted, instead of retrying it", async () => {
    const h = harness(STAMPED);

    const result = await recoverApplyingJobs(h.db, "u1", { status: "applying" });

    expect(result.parked).toBe(1);
    const parked = h.updates.find((u) => u.stamped);
    expect(parked?.status).toBe("needs_user");
    expect(parked?.skipReason).toBe(MAYBE_SUBMITTED_REASON);
  });

  it("never sends a maybe-submitted job back to approved", async () => {
    const h = harness(STAMPED);

    await recoverApplyingJobs(h.db, "u1", { status: "applying" });

    expect(h.updates.filter((u) => u.stamped).every((u) => u.status !== "approved")).toBe(true);
  });

  // needs_user keeps the campaign active, and nothing else in the agenda surfaces such a job.
  it("asks the user about each parked job so the campaign can finish", async () => {
    const h = harness(STAMPED);

    await recoverApplyingJobs(h.db, "u1", { status: "applying" });

    expect(h.questions).toHaveLength(1);
    expect(h.questions[0]).toMatchObject({
      userId: "u1",
      kind: "choice",
      subjectType: "job",
      subjectId: "c1:j1",
    });
    expect(String(h.questions[0]?.prompt)).toContain("Acme");
  });

  it("keeps the caller's scope on every write", async () => {
    const seen: Record<string, unknown>[] = [];
    const db = {
      job: {
        findMany: async ({ where }: { where: Record<string, unknown> }) => {
          seen.push(where);
          return [];
        },
        updateMany: async ({ where }: { where: Record<string, unknown> }) => {
          seen.push(where);
          return { count: 0 };
        },
      },
      pilotQuestion: { create: async () => ({}) },
    } as unknown as RecoveryWriter;

    await recoverApplyingJobs(db, "u1", { status: "applying", campaign: { userId: "u1" } });

    // A recovery that leaked past its user scope would touch another profile's jobs.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((w) => JSON.stringify(w.campaign) === JSON.stringify({ userId: "u1" }))).toBe(
      true,
    );
  });
});
