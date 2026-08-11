/**
 * What the match-score threshold is actually costing.
 *
 * It is the single most consequential number in the pilot's config - on the live data it rejected
 * 621 jobs, 54% of everything ever skipped - and the user picks it blind and never sees the
 * consequence. This turns it into a decision: at 55 you would have seen 70 more jobs, and here are
 * some of them.
 *
 * Deliberately not a recommendation. Whether those 70 are worth applying to is a judgment about
 * one's own career that the data cannot make - especially now, with no positive outcomes recorded
 * at any score. It shows the count and the examples and stops there.
 */

/** How far below the current threshold to model. Further down is noise, not a decision. */
export const THRESHOLD_STEPS = [5, 10, 15, 20] as const;

/** Examples per step: enough to judge the flavour of what is being missed, not a list to read. */
const EXAMPLES_PER_STEP = 3;

export interface SkippedByScore {
  title: string;
  company: string;
  matchScore: number | null;
  matchReason: string | null;
}

export interface ThresholdStep {
  threshold: number;
  /** Jobs that scored at or above this threshold but below the current one. */
  additionalJobs: number;
  examples: Array<{
    title: string;
    company: string;
    matchScore: number;
    matchReason: string | null;
  }>;
}

export interface ThresholdSimulation {
  currentThreshold: number;
  /** Everything ever skipped for scoring too low, at any score. */
  skippedByThreshold: number;
  steps: ThresholdStep[];
}

export function simulateThreshold(
  currentThreshold: number,
  skipped: SkippedByScore[],
): ThresholdSimulation {
  const scored = skipped
    .filter((job): job is SkippedByScore & { matchScore: number } => job.matchScore !== null)
    .sort((a, b) => b.matchScore - a.matchScore);

  const steps = THRESHOLD_STEPS.map((drop) => {
    const threshold = currentThreshold - drop;
    // At or above the candidate threshold: these are the jobs the lower bar would have admitted.
    const qualifying = scored.filter((job) => job.matchScore >= threshold);
    return {
      threshold,
      additionalJobs: qualifying.length,
      examples: qualifying.slice(0, EXAMPLES_PER_STEP).map((job) => ({
        title: job.title,
        company: job.company,
        matchScore: job.matchScore,
        matchReason: job.matchReason,
      })),
    };
  }).filter((step) => step.threshold > 0);

  return {
    currentThreshold,
    skippedByThreshold: skipped.length,
    steps,
  };
}
