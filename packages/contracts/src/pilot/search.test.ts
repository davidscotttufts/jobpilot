import { createPilotSearchSchema, updatePilotSearchSchema } from "./search";
import { describe, expect, it } from "bun:test";

describe("updatePilotSearchSchema", () => {
  it("leaves omitted fields out, so a one-field patch can't reset the schedule or reason", () => {
    expect(updatePilotSearchSchema.parse({ board: "linkedin.com" })).toEqual({
      board: "linkedin.com",
    });
  });

  it("still normalizes days and rejects a weekly schedule with none", () => {
    expect(updatePilotSearchSchema.parse({ cadenceDays: [4, 1, 4] }).cadenceDays).toEqual([1, 4]);
    expect(updatePilotSearchSchema.safeParse({ cadence: "weekly", cadenceDays: [] }).success).toBe(
      false,
    );
  });
});

describe("createPilotSearchSchema", () => {
  it("defaults the schedule and reason for a new search", () => {
    expect(createPilotSearchSchema.parse({ query: "q" })).toMatchObject({
      reason: "",
      cadence: "adaptive",
      cadenceDays: [],
      cadenceHour: 8,
      cadenceTimeZone: "UTC",
    });
  });
});
