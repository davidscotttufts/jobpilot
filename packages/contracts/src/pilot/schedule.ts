import { z } from "zod/v4";

/** Weekdays exactly as `Date#getDay()` numbers them: 0 = Sunday … 6 = Saturday. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const weekdaySchema = z.number().int().min(0).max(6);

/**
 * How a pilot search decides when to run again.
 *
 * `adaptive` is the pilot's own yield-based ladder (re-run a producing search soon, back a dry one
 * off). `weekly` pins it to days the user picked and takes the ladder out of the decision.
 */
export const PILOT_SEARCH_CADENCES = ["adaptive", "weekly"] as const;
export const pilotSearchCadenceSchema = z.enum(PILOT_SEARCH_CADENCES);

export type PilotSearchCadence = z.infer<typeof pilotSearchCadenceSchema>;

/** Whether the runtime knows this IANA zone; an unknown one makes every later run time wrong. */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const timeZoneSchema = z
  .string()
  .min(1)
  .refine(isTimeZone, { message: "Unknown IANA time zone." });

/** The schedule fields a search carries, shared by its create, update, and response schemas. */
export const pilotSearchScheduleFields = {
  cadence: pilotSearchCadenceSchema.default("adaptive"),
  /** Deduped and sorted: two Mondays are one Monday, and every reader renders them in week order. */
  cadenceDays: z
    .array(weekdaySchema)
    .max(7)
    .default([])
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  /** Hour of the day, in `cadenceTimeZone`. Minute granularity buys nothing at this cadence. */
  cadenceHour: z.number().int().min(0).max(23).default(8),
  cadenceTimeZone: timeZoneSchema.default("UTC"),
};

/** Whether a schedule is actually pinned - a weekly cadence with no days left is not. */
export function isPinnedWeekly(schedule: {
  cadence: PilotSearchCadence;
  cadenceDays: number[];
}): boolean {
  return schedule.cadence === "weekly" && schedule.cadenceDays.length > 0;
}

/** Offset from UTC, in ms, that `timeZone` was at `date` - DST included. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const at = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Some engines render midnight as hour 24; `% 24` puts it back on the same day.
  const asIfUtc = Date.UTC(
    at("year"),
    at("month") - 1,
    at("day"),
    at("hour") % 24,
    at("minute"),
    at("second"),
  );
  return asIfUtc - date.getTime();
}

interface ZonedDate {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

/** The calendar date and weekday `date` falls on inside `timeZone`. */
function zonedDate(date: Date, timeZone: string): ZonedDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const at = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(at("year")),
    month: Number(at("month")),
    day: Number(at("day")),
    weekday: WEEKDAY_LABELS.indexOf(at("weekday") as (typeof WEEKDAY_LABELS)[number]),
  };
}

/**
 * The UTC instant of a wall-clock hour on a calendar date in `timeZone`.
 *
 * Resolved by correcting a UTC guess against the zone's offset at that guess: the offset is what we
 * are solving for, but it only changes twice a year, so one correction is exact everywhere except
 * inside a DST gap - where the result lands on the far side of the gap, which is the behaviour a
 * user pinning "08:00" wants anyway.
 */
function zonedWallClockToUtc(date: ZonedDate, hour: number, timeZone: string): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day, hour, 0, 0);
  return new Date(guess - zoneOffsetMs(new Date(guess), timeZone));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The next instant matching a weekly schedule, strictly after `now`.
 *
 * Walks the next eight zone-local days rather than doing modular arithmetic on weekday numbers:
 * the walk is correct across month ends, leap days, and DST shifts for free, and eight iterations
 * guarantees a hit whenever at least one day is selected.
 */
export function nextWeeklyRun(
  days: readonly number[],
  hour: number,
  timeZone: string,
  now: Date,
): Date | null {
  if (days.length === 0) {
    return null;
  }
  for (let ahead = 0; ahead <= 7; ahead++) {
    const candidate = zonedDate(new Date(now.getTime() + ahead * DAY_MS), timeZone);
    if (!days.includes(candidate.weekday)) {
      continue;
    }
    const at = zonedWallClockToUtc(candidate, hour, timeZone);
    if (at.getTime() > now.getTime()) {
      return at;
    }
  }
  return null;
}

/** "Mon, Thu at 08:00" - the one-line schedule summary every surface shows. */
export function describeWeeklySchedule(
  days: readonly number[],
  hour: number,
  timeZone?: string,
): string {
  if (days.length === 0) {
    return "No days selected";
  }
  const named = days.length === 7 ? "Every day" : days.map((d) => WEEKDAY_LABELS[d]).join(", ");
  const time = `${String(hour).padStart(2, "0")}:00`;
  return timeZone ? `${named} at ${time} ${timeZone}` : `${named} at ${time}`;
}
