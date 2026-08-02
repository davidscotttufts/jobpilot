import { classifySkipReason, type SkipBucket } from "./pilot.stats";
import { describe, expect, it } from "bun:test";

describe("classifySkipReason", () => {
  const cases: [string, SkipBucket][] = [
    ["US citizenship required", "citizenship"],
    ["Active security clearance required", "clearance"],
    ['No visa sponsorship (JD: "we are not able to provide visa sponsorship")', "sponsorship"],
    ["Already applied (url)", "alreadyApplied"],
    ["Already applied (fuzzy)", "alreadyApplied"],
    ["CAPTCHA - apply manually via the apply skill", "captcha"],
    ["Payment required", "payment"],
    ["Below minimum match score (52 < 60)", "belowMinScore"],
    ["Posting is no longer accepting applications", "postingClosed"],
    ["Recruiter asked for a portfolio we don't have", "other"],
  ];

  for (const [reason, bucket] of cases) {
    it(`buckets "${reason}" as ${bucket}`, () => {
      expect(classifySkipReason(reason)).toBe(bucket);
    });
  }

  it("is case-insensitive", () => {
    expect(classifySkipReason("us CITIZENSHIP required")).toBe("citizenship");
  });

  // Same precedence as the scoring detector: a reason naming both is the sponsorship problem.
  it("reports sponsorship when a reason names both bars", () => {
    expect(classifySkipReason("US citizenship required, no sponsorship offered")).toBe(
      "sponsorship",
    );
  });
});
