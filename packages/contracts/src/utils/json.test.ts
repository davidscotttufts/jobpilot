import { storedDate } from "./json";
import { describe, expect, it } from "bun:test";

describe("storedDate", () => {
  it("revives an ISO string written to a JSON column", () => {
    const at = new Date("2026-09-08T08:07:00.000Z");
    const stored: unknown = JSON.parse(JSON.stringify({ at }));
    expect(storedDate.parse((stored as { at: unknown }).at)).toEqual(at);
  });

  it("passes a Date through unchanged", () => {
    const at = new Date("2026-09-08T08:07:00.000Z");
    expect(storedDate.parse(at)).toBe(at);
  });

  it("rejects null, numbers, and garbage strings", () => {
    expect(storedDate.safeParse(null).success).toBe(false);
    expect(storedDate.safeParse(0).success).toBe(false);
    expect(storedDate.safeParse("not a date").success).toBe(false);
  });
});
