// A heartbeat slides `expiresAt` forward, so a stuck-but-beating apply used to run unbounded -
// 26 real failures averaged 43 minutes against a 15-minute TTL. The cap is what ends them.
import type { PrismaClient } from "@/generated/prisma/client";
import type { CampaignJobService } from "@/modules/campaign/jobs/job.service";
import { ClaimService } from "./claim.service";
import { MAX_APPLY_CLAIM_LIFETIME_MS } from "./constants";
import { describe, expect, it } from "bun:test";

const CLAIM_TTL_MS = 15 * 60 * 1000;
const MINUTE = 60 * 1000;

const USER_ID = "8d71b5f1-3a64-43b1-ac29-ebda08c7eba6";
const CLAIM_ID = "4c965efd-b586-49ea-825b-1af715760116";

const PAYLOADS: Record<string, { subjectType: string; payload: Record<string, unknown> }> = {
  "job.apply": {
    subjectType: "job",
    payload: {
      campaignId: "c1",
      jobKey: "j1",
      url: "https://example.test/job",
      board: null,
      digest: null,
      matchScore: 90,
    },
  },
  "question.answered": {
    subjectType: "question",
    payload: {
      questionId: "q1",
      questionKind: "salary",
      subjectType: null,
      subjectId: null,
      prompt: "Expected salary?",
      answer: "180000",
    },
  },
};

function setup(kind: string, grantedMinutesAgo: number) {
  const updates: Record<string, unknown>[] = [];
  const grantedAt = new Date(Date.now() - grantedMinutesAgo * MINUTE);
  const shape = PAYLOADS[kind];
  const db = {
    pilotClaim: {
      findFirst: async () => ({ kind, grantedAt }),
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({
        id: CLAIM_ID,
        userId: USER_ID,
        kind,
        subjectType: shape.subjectType,
        subjectId: "s1",
        payload: shape.payload,
        grantedAt,
        heartbeatAt: new Date(),
        expiresAt: updates[0]?.expiresAt ?? new Date(),
        releasedAt: null,
        outcome: null,
      }),
    },
  };
  const campaignJobs = {} as unknown as CampaignJobService;
  return {
    service: new ClaimService(db as unknown as PrismaClient, campaignJobs),
    grantedAt,
    expiry: () => {
      const written = updates[0];
      if (!written) {
        throw new Error("heartbeat wrote no expiry");
      }
      return (written.expiresAt as Date).getTime();
    },
  };
}

describe("ClaimService heartbeat lifetime cap", () => {
  it("holds a long-running apply to the ceiling instead of sliding past it", async () => {
    const state = setup("job.apply", 20);

    await state.service.heartbeat(USER_ID, CLAIM_ID);

    // Sliding alone would have given now + 15min, i.e. 35 minutes after the grant.
    expect(state.expiry()).toBe(state.grantedAt.getTime() + MAX_APPLY_CLAIM_LIFETIME_MS);
  });

  it("leaves the normal sliding window alone while an apply is still well inside the cap", async () => {
    const state = setup("job.apply", 1);

    await state.service.heartbeat(USER_ID, CLAIM_ID);

    expect(state.expiry()).toBeGreaterThan(Date.now() + CLAIM_TTL_MS - MINUTE);
    expect(state.expiry()).toBeLessThanOrEqual(Date.now() + CLAIM_TTL_MS);
  });

  it("expires an apply that is already past the ceiling", async () => {
    const state = setup("job.apply", 40);

    await state.service.heartbeat(USER_ID, CLAIM_ID);

    // In the past, so the next expiry sweep releases it and returns the job to `approved`.
    expect(state.expiry()).toBeLessThan(Date.now());
  });

  // A question waits on a human and legitimately runs for hours - one real claim ran 6.
  it("does not cap a kind that waits on the user", async () => {
    const state = setup("question.answered", 180);

    await state.service.heartbeat(USER_ID, CLAIM_ID);

    expect(state.expiry()).toBeGreaterThan(Date.now() + CLAIM_TTL_MS - MINUTE);
  });
});
