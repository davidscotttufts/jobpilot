// The next-search wake time in isolation - no database.

import { SEARCH_CLAIM_COOLDOWN_MS } from "./constants";
import { earliestSearchWake, type LatestClaim } from "./gather-jobs";
import { describe, expect, it } from "bun:test";

const HOUR_MS = 60 * 60 * 1000;
const now = new Date("2026-09-21T02:00:00Z");
const at = (hours: number) => new Date(now.getTime() + hours * HOUR_MS);

function released(hoursAgo: number, outcome: string): LatestClaim {
  return { grantedAt: at(-hoursAgo - 1), releasedAt: at(-hoursAgo), outcome };
}

function wake(searches: { id: string; nextRunAt: Date }[], claims: Record<string, LatestClaim>) {
  return earliestSearchWake(searches, new Map(Object.entries(claims)), SEARCH_CLAIM_COOLDOWN_MS);
}

describe("earliestSearchWake", () => {
  it("is the earliest nextRunAt when nothing is damped", () => {
    const searches = [
      { id: "a", nextRunAt: at(8) },
      { id: "b", nextRunAt: at(3) },
    ];
    expect(wake(searches, {})).toEqual(at(3));
  });

  it("waits for the damper on an overdue search instead of reporting it due now", () => {
    const searches = [
      { id: "overdue", nextRunAt: at(-80) },
      { id: "later", nextRunAt: at(7) },
    ];
    expect(wake(searches, { overdue: released(1, "expired") })).toEqual(at(1));
  });

  it("reads as due now once the damper on an overdue search has lifted", () => {
    const searches = [{ id: "overdue", nextRunAt: at(-80) }];
    const result = wake(searches, { overdue: released(3, "expired") });
    expect(result).toEqual(at(-1));
    expect((result as Date) <= now).toBe(true);
  });

  it("keeps nextRunAt when it falls after the damper", () => {
    const searches = [{ id: "a", nextRunAt: at(8) }];
    expect(wake(searches, { a: released(0.5, "done") })).toEqual(at(8));
  });

  it("skips a search whose claim is still in flight", () => {
    const searches = [
      { id: "running", nextRunAt: at(-1) },
      { id: "later", nextRunAt: at(5) },
    ];
    const inFlight: LatestClaim = { grantedAt: at(-0.1), releasedAt: null, outcome: null };
    expect(wake(searches, { running: inFlight })).toEqual(at(5));
  });

  it("is null with no searches", () => {
    expect(wake([], {})).toBeNull();
  });
});
