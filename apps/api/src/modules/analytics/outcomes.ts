import type { ApplicationStatus } from "@jobpilot/contracts/application";

/**
 * Which slices of the pipeline actually go anywhere.
 *
 * The app measures volume well and conversion not at all: 143 applications, and no way to tell
 * whether the score threshold, the board, or the resume variant is doing any work. This turns the
 * outcomes already recorded into per-slice rates.
 *
 * Three distinctions the naive version gets wrong, each of which inverts the conclusion:
 *
 *  - A rejection is a *response*, not a success. Lumping "anything that is not still applied" into
 *    one rate makes the band with the most rejections look like the best performer. On the current
 *    data that is exactly what happens - every recorded outcome is a rejection.
 *  - Silence is not failure. Most applications are days old; an unanswered one is pending, not lost,
 *    so it belongs in neither numerator.
 *  - A rate over three applications is not a rate. Slices below the sample floor report counts and
 *    withhold the percentage rather than inviting a decision the data cannot support.
 */

/** Statuses that mean an employer engaged rather than declined. */
const ADVANCED: readonly ApplicationStatus[] = ["screening", "interviewing", "offer"];

/** Below this, report counts and no rate - a percentage here would be read as signal. */
export const MIN_SAMPLE = 10;

export interface OutcomeRow {
  key: string;
  applications: number;
  advanced: number;
  rejected: number;
  /** Still `applied`: no reply yet, which is not the same as a "no". */
  silent: number;
  /** Share that advanced, or null when the slice is too small to support one. */
  advanceRate: number | null;
  /** Share that produced any reply at all, advance or rejection. */
  replyRate: number | null;
}

export interface OutcomeApplication {
  status: ApplicationStatus;
  board: string | null;
  matchScore: number | null;
  normalizedTitle: string;
}

export function scoreBand(score: number | null): string {
  if (score === null) return "unscored";
  if (score >= 90) return "90+";
  if (score >= 80) return "80-89";
  if (score >= 70) return "70-79";
  if (score >= 60) return "60-69";
  return "<60";
}

function summarize(key: string, rows: OutcomeApplication[]): OutcomeRow {
  const applications = rows.length;
  const advanced = rows.filter((r) => ADVANCED.includes(r.status)).length;
  const rejected = rows.filter((r) => r.status === "rejected").length;
  const enough = applications >= MIN_SAMPLE;
  return {
    key,
    applications,
    advanced,
    rejected,
    silent: applications - advanced - rejected,
    advanceRate: enough ? advanced / applications : null,
    replyRate: enough ? (advanced + rejected) / applications : null,
  };
}

function group(
  rows: OutcomeApplication[],
  keyOf: (row: OutcomeApplication) => string,
): OutcomeRow[] {
  const buckets = new Map<string, OutcomeApplication[]>();
  for (const row of rows) {
    const key = keyOf(row);
    buckets.set(key, [...(buckets.get(key) ?? []), row]);
  }
  return [...buckets.entries()]
    .map(([key, group]) => summarize(key, group))
    .sort((a, b) => b.applications - a.applications);
}

export interface OutcomeBreakdown {
  overall: OutcomeRow;
  byBoard: OutcomeRow[];
  byScoreBand: OutcomeRow[];
  byTitle: OutcomeRow[];
  /**
   * True while no application has advanced past `applied`. Every rate is then a rejection rate,
   * and reading them as conversion inverts the answer - the UI says so rather than drawing a chart
   * that implies otherwise.
   */
  noPositiveOutcomesYet: boolean;
}

/** Titles below this are folded into "other": one application per title is noise, not a slice. */
const MIN_TITLE_APPLICATIONS = 5;

export function buildOutcomeBreakdown(rows: OutcomeApplication[]): OutcomeBreakdown {
  const byTitle = group(rows, (r) => r.normalizedTitle || "unknown").filter(
    (r) => r.applications >= MIN_TITLE_APPLICATIONS,
  );

  return {
    overall: summarize("all", rows),
    byBoard: group(rows, (r) => r.board ?? "unknown"),
    byScoreBand: group(rows, (r) => scoreBand(r.matchScore)),
    byTitle,
    noPositiveOutcomesYet: rows.every((r) => !ADVANCED.includes(r.status)),
  };
}
