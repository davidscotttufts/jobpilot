// The threshold rejected 621 jobs on the live data - 54% of every skip - and was chosen blind.
import { type SkippedByScore, simulateThreshold, THRESHOLD_STEPS } from "./score-threshold";
import { describe, expect, it } from "bun:test";

function job(matchScore: number | null, over: Partial<SkippedByScore> = {}): SkippedByScore {
  return {
    title: "Director of Engineering",
    company: "Acme",
    matchScore,
    matchReason: "partial stack overlap",
    ...over,
  };
}

describe("simulateThreshold", () => {
  it("counts what a lower bar would have admitted, cumulatively", () => {
    const skipped = [
      ...Array.from({ length: 70 }, () => job(57)),
      ...Array.from({ length: 33 }, () => job(52)),
      ...Array.from({ length: 446 }, () => job(20)),
    ];

    const result = simulateThreshold(60, skipped);

    expect(result.skippedByThreshold).toBe(549);
    // 55 admits the 57s; 50 admits the 57s and the 52s - each step includes the ones above it.
    expect(result.steps.find((s) => s.threshold === 55)?.additionalJobs).toBe(70);
    expect(result.steps.find((s) => s.threshold === 50)?.additionalJobs).toBe(103);
  });

  it("shows the highest-scoring examples first, so the judgment is on the best of them", () => {
    const skipped = [
      job(41, { company: "Low" }),
      job(58, { company: "Near" }),
      job(50, { company: "Mid" }),
    ];

    const step = simulateThreshold(60, skipped).steps.find((s) => s.threshold === 40);

    expect(step?.examples.map((e) => e.company)).toEqual(["Near", "Mid", "Low"]);
  });

  it("carries the reason, so a near-miss can be judged rather than guessed at", () => {
    const skipped = [job(58, { matchReason: "no Kubernetes experience listed" })];

    const step = simulateThreshold(60, skipped).steps.find((s) => s.threshold === 55);

    expect(step?.examples[0]?.matchReason).toBe("no Kubernetes experience listed");
  });

  it("ignores unscored jobs rather than assuming a score for them", () => {
    const skipped = [job(null), job(null), job(58)];

    const result = simulateThreshold(60, skipped);

    // Still counted in the total skipped, but they cannot qualify for any threshold.
    expect(result.skippedByThreshold).toBe(3);
    expect(result.steps.find((s) => s.threshold === 55)?.additionalJobs).toBe(1);
  });

  it("does not model a negative threshold", () => {
    const result = simulateThreshold(10, [job(5)]);

    expect(result.steps.every((s) => s.threshold > 0)).toBe(true);
    expect(result.steps).toHaveLength(1);
  });

  it("reports nothing to gain when everything skipped scored far below", () => {
    const result = simulateThreshold(60, [job(3), job(5)]);

    expect(result.steps.every((s) => s.additionalJobs === 0)).toBe(true);
  });

  it("models every configured step", () => {
    const result = simulateThreshold(90, [job(85)]);

    expect(result.steps.map((s) => s.threshold)).toEqual(THRESHOLD_STEPS.map((d) => 90 - d));
  });
});
