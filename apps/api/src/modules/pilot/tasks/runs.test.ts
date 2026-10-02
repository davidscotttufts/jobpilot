import { HOUR_MS } from "@/common/date/buckets";
import { parseJobSubject, ranRecently } from "./runs";
import { describe, expect, it } from "bun:test";

describe("ranRecently", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");
  const finishedHoursAgo = (hours: number, outcome: "done" | "expired" | "abandoned") => ({
    startedAt: new Date(now.getTime() - (hours + 1) * HOUR_MS),
    finishedAt: new Date(now.getTime() - hours * HOUR_MS),
    outcome,
  });
  const DAY = 24 * HOUR_MS;

  it("damps a subject whose run is still open", () => {
    expect(ranRecently({ startedAt: now, finishedAt: null, outcome: null }, now, DAY)).toBe(true);
  });

  it("damps a deliberate outcome for the whole cooldown", () => {
    expect(ranRecently(finishedHoursAgo(3, "done"), now, DAY)).toBe(true);
    expect(ranRecently(finishedHoursAgo(25, "done"), now, DAY)).toBe(false);
  });

  it("lets a crashed run retry after two hours, whatever the cooldown", () => {
    expect(ranRecently(finishedHoursAgo(1, "expired"), now, DAY)).toBe(true);
    expect(ranRecently(finishedHoursAgo(3, "expired"), now, DAY)).toBe(false);
    expect(ranRecently(finishedHoursAgo(3, "abandoned"), now, DAY)).toBe(false);
  });

  it("never damps a subject with no run", () => {
    expect(ranRecently(null, now, DAY)).toBe(false);
  });
});

describe("parseJobSubject", () => {
  it("splits on the first colon, so job keys may contain colons", () => {
    expect(parseJobSubject("c1:a:b")).toEqual({ campaignId: "c1", key: "a:b" });
  });

  it("rejects a subject missing either half", () => {
    expect(() => parseJobSubject(":j1")).toThrow();
    expect(() => parseJobSubject("c1:")).toThrow();
  });
});
