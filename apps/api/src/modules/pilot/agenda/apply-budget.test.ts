// The cap is otherwise only applied when the agenda is built, so N workers claiming off one
// snapshot would each pass a stale count. In-flight applies have to count toward it, because an
// Application row does not exist until the result is written minutes later.
import { type ApplyBudgetReader, assertApplyBudget } from "./apply-budget";
import { describe, expect, it } from "bun:test";

const NOW = new Date("2026-08-10T15:00:00Z");

function reader(cap: number, appliedToday: number, inFlight: number): ApplyBudgetReader {
  return {
    pilotState: { findUnique: async () => ({ instructionsConfig: { dailyApplyCap: cap } }) },
    application: { count: async () => appliedToday },
    job: { count: async () => inFlight },
  } as unknown as ApplyBudgetReader;
}

describe("assertApplyBudget", () => {
  it("allows a claim with room left", async () => {
    await expect(assertApplyBudget(reader(10, 4, 1), "u1", NOW)).resolves.toBeUndefined();
  });

  it("blocks once recorded applications alone reach the cap", async () => {
    await expect(assertApplyBudget(reader(10, 10, 0), "u1", NOW)).rejects.toThrow(
      /Daily apply cap reached/,
    );
  });

  // The concurrency case: 8 recorded, 2 already being applied to, so the cap is committed even
  // though only 8 rows exist. Counting rows alone would let every worker through.
  it("counts in-flight applies toward the cap", async () => {
    await expect(assertApplyBudget(reader(10, 8, 2), "u1", NOW)).rejects.toThrow(
      /8 applied and 2 in flight/,
    );
  });

  it("blocks everything at a zero cap", async () => {
    await expect(assertApplyBudget(reader(0, 0, 0), "u1", NOW)).rejects.toThrow(
      /Daily apply cap reached/,
    );
  });

  it("falls back to the default cap when config is empty", async () => {
    const db = {
      pilotState: { findUnique: async () => ({ instructionsConfig: {} }) },
      application: { count: async () => 9 },
      job: { count: async () => 0 },
    } as unknown as ApplyBudgetReader;

    // Default dailyApplyCap is 10, so 9 still has room.
    await expect(assertApplyBudget(db, "u1", NOW)).resolves.toBeUndefined();
  });
});
