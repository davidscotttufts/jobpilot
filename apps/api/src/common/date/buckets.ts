/** The rolling window every timeline series in the app is drawn over. */
export const DAYS_IN_TIMELINE = 30;

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Midnight 6 days ago - "this week" is a rolling 7-day window, not a calendar week. */
export function startOfWeek(): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - 6);
  return d;
}

export function startOfTimeline(): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - (DAYS_IN_TIMELINE - 1));
  return d;
}

export function isoDateKey(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}

/** Bucket timestamps into a zero-filled, day-by-day series of `days` days starting at `start`. */
export function bucketPerDay(
  dates: Date[],
  start: Date,
  days: number = DAYS_IN_TIMELINE,
): { date: string; count: number }[] {
  const perDayMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    perDayMap.set(isoDateKey(d), 0);
  }
  for (const date of dates) {
    const key = isoDateKey(date);
    if (perDayMap.has(key)) {
      perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1);
    }
  }
  return Array.from(perDayMap.entries()).map(([date, count]) => ({ date, count }));
}
