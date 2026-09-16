import { z } from "zod/v4";
import {
  describeWeeklySchedule,
  isPinnedWeekly,
  isTimeZone,
  latestDailyRun,
  nextDailyRun,
  nextWeeklyRun,
  pilotSearchScheduleFields,
} from "./schedule";
import { describe, expect, it } from "bun:test";

const NY = "America/New_York";

/** What the wall clock in `zone` reads at `date` - the assertion these tests actually care about. */
function wallClock(date: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

describe("nextWeeklyRun", () => {
  it("returns null when no day is selected", () => {
    expect(nextWeeklyRun([], 8, NY, new Date("2026-09-02T12:00:00Z"))).toBeNull();
  });

  it("fires later the same day when the hour is still ahead", () => {
    // Wednesday 2026-09-02, 06:00 in New York (10:00Z).
    const now = new Date("2026-09-02T10:00:00Z");
    const next = nextWeeklyRun([3], 8, NY, now);
    expect(wallClock(next!, NY)).toBe("Wed, 09/02/2026, 08:00");
  });

  it("rolls to next week when today's hour has passed", () => {
    // Wednesday 2026-09-02, 09:00 in New York - 08:00 is gone.
    const now = new Date("2026-09-02T13:00:00Z");
    const next = nextWeeklyRun([3], 8, NY, now);
    expect(wallClock(next!, NY)).toBe("Wed, 09/09/2026, 08:00");
  });

  it("picks the nearest selected day across a month boundary", () => {
    // Monday 2026-08-31 in New York; next selected day is Tuesday, in September.
    const now = new Date("2026-08-31T14:00:00Z");
    const next = nextWeeklyRun([2, 4], 9, NY, now);
    expect(wallClock(next!, NY)).toBe("Tue, 09/01/2026, 09:00");
  });

  it("treats every day as selected without skipping one", () => {
    const now = new Date("2026-09-02T13:00:00Z");
    const next = nextWeeklyRun([0, 1, 2, 3, 4, 5, 6], 8, NY, now);
    expect(wallClock(next!, NY)).toBe("Thu, 09/03/2026, 08:00");
  });

  it("holds the wall-clock hour across the autumn DST change", () => {
    // 2026-11-01 is the US fall-back, so these two Mondays sit either side of it.
    const before = nextWeeklyRun([1], 8, NY, new Date("2026-10-20T13:00:00Z"));
    const after = nextWeeklyRun([1], 8, NY, new Date("2026-10-27T13:00:00Z"));
    expect(wallClock(before!, NY)).toBe("Mon, 10/26/2026, 08:00");
    expect(wallClock(after!, NY)).toBe("Mon, 11/02/2026, 08:00");
    // Same wall clock, an hour apart in UTC - that is the whole point of storing a zone.
    expect(before!.toISOString()).toBe("2026-10-26T12:00:00.000Z");
    expect(after!.toISOString()).toBe("2026-11-02T13:00:00.000Z");
  });

  it("holds the wall-clock hour across the spring DST change", () => {
    const next = nextWeeklyRun([0], 8, NY, new Date("2026-03-05T13:00:00Z"));
    expect(wallClock(next!, NY)).toBe("Sun, 03/08/2026, 08:00");
  });

  it("resolves midnight, the hour most likely to land on the wrong day", () => {
    const next = nextWeeklyRun([5], 0, NY, new Date("2026-09-02T13:00:00Z"));
    expect(wallClock(next!, NY)).toBe("Fri, 09/04/2026, 00:00");
  });

  it("is always strictly in the future, even called exactly on the hour", () => {
    const onTheHour = nextWeeklyRun([3], 8, NY, new Date("2026-09-02T12:00:00Z"));
    expect(wallClock(onTheHour!, NY)).toBe("Wed, 09/09/2026, 08:00");
  });

  it("respects the zone it is given rather than the host's", () => {
    const now = new Date("2026-09-02T13:00:00Z");
    const tokyo = nextWeeklyRun([4], 8, "Asia/Tokyo", now);
    expect(wallClock(tokyo!, "Asia/Tokyo")).toBe("Thu, 09/03/2026, 08:00");
  });
});

describe("isPinnedWeekly", () => {
  it("is false for the adaptive ladder", () => {
    expect(isPinnedWeekly({ cadence: "adaptive", cadenceDays: [1] })).toBe(false);
  });

  it("is false for a weekly cadence that lost its days", () => {
    expect(isPinnedWeekly({ cadence: "weekly", cadenceDays: [] })).toBe(false);
  });

  it("is true only when a weekly cadence still has a day", () => {
    expect(isPinnedWeekly({ cadence: "weekly", cadenceDays: [1, 4] })).toBe(true);
  });
});

describe("schedule field parsing", () => {
  const schema = z.object(pilotSearchScheduleFields);

  it("dedupes and sorts the selected days", () => {
    const parsed = schema.parse({ cadenceDays: [4, 1, 4, 0] });
    expect(parsed.cadenceDays).toEqual([0, 1, 4]);
  });

  it("defaults to the adaptive ladder", () => {
    expect(schema.parse({}).cadence).toBe("adaptive");
  });

  it("rejects an unknown time zone", () => {
    expect(schema.safeParse({ cadenceTimeZone: "Mars/Olympus" }).success).toBe(false);
  });

  it("rejects an hour outside the day", () => {
    expect(schema.safeParse({ cadenceHour: 24 }).success).toBe(false);
  });
});

describe("isTimeZone", () => {
  it("accepts a real IANA zone and rejects nonsense", () => {
    expect(isTimeZone(NY)).toBe(true);
    expect(isTimeZone("Nowhere/Nothing")).toBe(false);
  });
});

describe("describeWeeklySchedule", () => {
  it("names the days in week order with a padded hour", () => {
    expect(describeWeeklySchedule([1, 4], 8)).toBe("Mon, Thu at 08:00");
  });

  it("collapses a full week", () => {
    expect(describeWeeklySchedule([0, 1, 2, 3, 4, 5, 6], 17)).toBe("Every day at 17:00");
  });

  it("says so when nothing is selected", () => {
    expect(describeWeeklySchedule([], 8)).toBe("No days selected");
  });
});

describe("daily runs", () => {
  // Wednesday 2026-09-02, 12:30 in New York (16:30Z).
  const now = new Date("2026-09-02T16:30:00Z");

  it("finds the next slot later today", () => {
    expect(wallClock(nextDailyRun([8, 17], NY, now)!, NY)).toBe("Wed, 09/02/2026, 17:00");
  });

  it("rolls the next slot to tomorrow once today's have passed", () => {
    expect(wallClock(nextDailyRun([8, 11], NY, now)!, NY)).toBe("Thu, 09/03/2026, 08:00");
  });

  it("finds the latest slot earlier today", () => {
    expect(wallClock(latestDailyRun([8, 17], NY, now)!, NY)).toBe("Wed, 09/02/2026, 08:00");
  });

  it("reaches back to yesterday before today's first slot", () => {
    const early = new Date("2026-09-02T10:00:00Z"); // 06:00 in New York
    expect(wallClock(latestDailyRun([8, 17], NY, early)!, NY)).toBe("Tue, 09/01/2026, 17:00");
  });

  it("counts a slot striking exactly now as passed", () => {
    const onTheHour = new Date("2026-09-02T12:00:00Z"); // 08:00 in New York
    expect(latestDailyRun([8], NY, onTheHour)!.getTime()).toBe(onTheHour.getTime());
  });

  it("returns null with no hours", () => {
    expect(nextDailyRun([], NY, now)).toBeNull();
    expect(latestDailyRun([], NY, now)).toBeNull();
  });
});
