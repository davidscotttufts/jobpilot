// Imports the pure folding helpers directly - `campaign.summary.ts` only type-imports Prisma, so no
// runtime Prisma or `@/env` is pulled in and the suite runs with no database/env.
import type { CampaignJobStatus } from "@jobpilot/contracts/campaign";
import { emptySummary, fold, summarizeJobs } from "./campaign.summary";
import { describe, expect, it } from "bun:test";

describe("emptySummary", () => {
  it("zeroes every counter", () => {
    expect(emptySummary()).toEqual({
      totalFound: 0,
      qualified: 0,
      applied: 0,
      failed: 0,
      skipped: 0,
      remaining: 0,
      discovered: 0,
      drafted: 0,
      sent: 0,
      replied: 0,
      bounced: 0,
    });
  });
});

describe("fold", () => {
  const foldOne = (status: CampaignJobStatus) => {
    const summary = emptySummary();
    fold(summary, status, 1);
    return summary;
  };

  it("always counts toward totalFound", () => {
    for (const status of [
      "pending",
      "approved",
      "applying",
      "applied",
      "failed",
      "skipped",
    ] as const) {
      expect(foldOne(status).totalFound).toBe(1);
    }
  });

  it("counts every non-skipped status as qualified", () => {
    expect(foldOne("applied").qualified).toBe(1);
    expect(foldOne("pending").qualified).toBe(1);
    expect(foldOne("skipped").qualified).toBe(0);
  });

  it("routes terminal outcomes to their own bucket", () => {
    expect(foldOne("applied")).toMatchObject({ applied: 1, failed: 0, skipped: 0, remaining: 0 });
    expect(foldOne("failed")).toMatchObject({ applied: 0, failed: 1, skipped: 0, remaining: 0 });
    expect(foldOne("skipped")).toMatchObject({ applied: 0, failed: 0, skipped: 1, remaining: 0 });
  });

  it("counts approved/applying as remaining, but not pending", () => {
    expect(foldOne("approved").remaining).toBe(1);
    expect(foldOne("applying").remaining).toBe(1);
    // Pending is qualified-but-not-yet-in-flight: it must not inflate remaining.
    expect(foldOne("pending").remaining).toBe(0);
  });

  it("adds the supplied count, not just one", () => {
    const summary = emptySummary();
    fold(summary, "applied", 5);
    expect(summary).toMatchObject({ totalFound: 5, qualified: 5, applied: 5 });
  });
});

describe("summarizeJobs", () => {
  it("folds a mixed set of rows", () => {
    const summary = summarizeJobs([
      { status: "applied" },
      { status: "applied" },
      { status: "failed" },
      { status: "skipped" },
      { status: "approved" },
      { status: "pending" },
    ]);

    expect(summary).toMatchObject({
      totalFound: 6,
      qualified: 5, // all but the skipped one
      applied: 2,
      failed: 1,
      skipped: 1,
      remaining: 1, // approved; pending does not count
    });
  });

  it("returns an empty summary for no rows", () => {
    expect(summarizeJobs([])).toEqual(emptySummary());
  });
});
