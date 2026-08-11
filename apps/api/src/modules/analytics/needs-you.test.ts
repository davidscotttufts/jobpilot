// 51 CAPTCHA skips accumulated on a distinction the product never surfaced: permanent for the
// agent (hand-clicking tiles gets flagged) is not permanent for a person.
import { findActionableJobs, type SkippedJob } from "./needs-you";
import { describe, expect, it } from "bun:test";

const BASE = new Date("2026-08-10T00:00:00Z").getTime();

function job(skipReason: string | null, minutesAgo = 0): SkippedJob {
  return {
    campaignId: "c1",
    key: `j-${skipReason}-${minutesAgo}`,
    title: "Director of Engineering",
    company: "Acme",
    url: "https://hiringcafe.com/job/x",
    skipReason,
    updatedAt: new Date(BASE - minutesAgo * 60_000),
  };
}

describe("findActionableJobs", () => {
  it("surfaces a CAPTCHA, which a person can clear and the agent cannot", () => {
    const found = findActionableJobs([job("CAPTCHA - apply manually via the apply skill")], 10);

    expect(found).toHaveLength(1);
    expect(found[0]?.blockedBy).toBe("captcha");
  });

  it("surfaces a job dropped by an unanswered question", () => {
    const found = findActionableJobs([job("Question expired without an answer.")], 10);

    expect(found[0]?.blockedBy).toBe("unanswered-question");
  });

  it("leaves out what attention cannot change", () => {
    const noise = [
      job("Active security clearance required"),
      job("No visa sponsorship (JD: ...)"),
      job("Below minimum match score (42 < 60)"),
      job("Already applied (url)"),
      job(null),
    ];

    // Padding the queue with these is how a queue like this becomes ignorable.
    expect(findActionableJobs(noise, 10)).toEqual([]);
  });

  it("puts the freshest first, since a stale posting is likelier to be filled", () => {
    const found = findActionableJobs(
      [job("CAPTCHA", 600), job("CAPTCHA", 5), job("CAPTCHA", 120)],
      10,
    );

    expect(found.map((j) => j.updatedAt.getTime())).toEqual([
      BASE - 5 * 60_000,
      BASE - 120 * 60_000,
      BASE - 600 * 60_000,
    ]);
  });

  it("caps the list rather than handing over a backlog", () => {
    const many = Array.from({ length: 40 }, (_, i) => job("CAPTCHA", i));

    expect(findActionableJobs(many, 8)).toHaveLength(8);
  });
});
