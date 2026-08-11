// The trap this exists to avoid: on the real data every recorded outcome is a rejection, so a
// single "responded" rate ranks the band with the most rejections highest and reads as
// "low scores convert better".
import type { ApplicationStatus } from "@jobpilot/contracts/application";
import { buildOutcomeBreakdown, MIN_SAMPLE, type OutcomeApplication, scoreBand } from "./outcomes";
import { describe, expect, it } from "bun:test";

function apps(n: number, over: Partial<OutcomeApplication> = {}): OutcomeApplication[] {
  return Array.from({ length: n }, () => ({
    status: "applied" as ApplicationStatus,
    board: "hiringcafe.com",
    matchScore: 75,
    normalizedTitle: "director engineering",
    ...over,
  }));
}

describe("buildOutcomeBreakdown", () => {
  it("counts a rejection as a reply but never as an advance", () => {
    const rows = [...apps(8), ...apps(2, { status: "rejected" })];

    const { overall } = buildOutcomeBreakdown(rows);

    expect(overall).toMatchObject({ applications: 10, advanced: 0, rejected: 2, silent: 8 });
    expect(overall.replyRate).toBeCloseTo(0.2);
    expect(overall.advanceRate).toBe(0);
  });

  it("treats an unanswered application as pending, not as a failure", () => {
    const { overall } = buildOutcomeBreakdown(apps(12));

    expect(overall.silent).toBe(12);
    expect(overall.advanceRate).toBe(0);
    expect(overall.replyRate).toBe(0);
  });

  it("withholds a rate below the sample floor rather than implying signal", () => {
    const thin = buildOutcomeBreakdown(apps(MIN_SAMPLE - 1, { board: "tiny.example" }));

    expect(thin.overall.applications).toBe(MIN_SAMPLE - 1);
    expect(thin.overall.advanceRate).toBeNull();
    expect(thin.overall.replyRate).toBeNull();
  });

  it("flags that no application has advanced, so every rate is a rejection rate", () => {
    const rows = [...apps(20), ...apps(5, { status: "rejected" })];

    expect(buildOutcomeBreakdown(rows).noPositiveOutcomesYet).toBe(true);
  });

  it("clears that flag as soon as one application advances", () => {
    const rows = [...apps(20), ...apps(1, { status: "interviewing" })];

    expect(buildOutcomeBreakdown(rows).noPositiveOutcomesYet).toBe(false);
  });

  it("ranks boards by volume and reports each slice's own counts", () => {
    const rows = [
      ...apps(12, { board: "hiringcafe.com", status: "rejected" }),
      ...apps(15, { board: "indeed.com" }),
    ];

    const { byBoard } = buildOutcomeBreakdown(rows);

    expect(byBoard.map((b) => b.key)).toEqual(["indeed.com", "hiringcafe.com"]);
    expect(byBoard.find((b) => b.key === "hiringcafe.com")).toMatchObject({
      rejected: 12,
      advanced: 0,
    });
  });

  it("drops one-off titles instead of showing a slice per job", () => {
    const rows = [
      ...apps(20, { normalizedTitle: "director engineering" }),
      ...apps(2, { normalizedTitle: "vp platform" }),
    ];

    expect(buildOutcomeBreakdown(rows).byTitle.map((t) => t.key)).toEqual(["director engineering"]);
  });

  it("keeps unscored applications in their own band rather than guessing one", () => {
    const rows = [...apps(10, { matchScore: null }), ...apps(10, { matchScore: 85 })];

    const bands = buildOutcomeBreakdown(rows)
      .byScoreBand.map((b) => b.key)
      .sort();

    expect(bands).toEqual(["80-89", "unscored"]);
  });
});

describe("scoreBand", () => {
  it("buckets on the thresholds the pilot actually uses", () => {
    expect(scoreBand(95)).toBe("90+");
    expect(scoreBand(85)).toBe("80-89");
    expect(scoreBand(70)).toBe("70-79");
    expect(scoreBand(60)).toBe("60-69");
    expect(scoreBand(59)).toBe("<60");
    expect(scoreBand(null)).toBe("unscored");
  });
});

// `rows.every(...)` is vacuously true on an empty list, which showed a user with no applications
// an alarming banner about "0 of 0".
describe("buildOutcomeBreakdown with no applications", () => {
  it("reports zero everywhere rather than inventing a story", () => {
    const empty = buildOutcomeBreakdown([]);

    expect(empty.overall).toMatchObject({ applications: 0, advanced: 0, rejected: 0, silent: 0 });
    expect(empty.byBoard).toEqual([]);
    // Still vacuously true - the UI gates the banner on having applications at all.
    expect(empty.noPositiveOutcomesYet).toBe(true);
  });
});
