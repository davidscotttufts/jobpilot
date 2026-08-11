/**
 * Jobs the agent cannot finish but a person can, in a couple of minutes each.
 *
 * `rescan-skipped` marks CAPTCHA permanent, and for the agent it is - hand-clicking tiles gets
 * flagged and fails. That makes it permanent for the *pilot*, not for the user, and 51 postings
 * have quietly accumulated on that distinction. The same is true of a verification prompt that
 * expired while nobody was looking.
 *
 * Everything else stays out. A clearance requirement or a no-sponsorship policy is not something
 * five minutes of attention changes, and padding this list with them would make it ignorable -
 * which is the only way a queue like this fails.
 */

export interface SkippedJob {
  campaignId: string;
  key: string;
  title: string;
  company: string;
  url: string;
  skipReason: string | null;
  updatedAt: Date;
}

export interface ActionableJob extends SkippedJob {
  /** Why a person can clear this when the agent could not. */
  blockedBy: "captcha" | "unanswered-question";
}

/** Prefixes the agent writes when the obstacle is one a human can simply do. */
const HUMAN_CLEARABLE: Array<{ prefix: string; blockedBy: ActionableJob["blockedBy"] }> = [
  { prefix: "CAPTCHA", blockedBy: "captcha" },
  { prefix: "Question expired", blockedBy: "unanswered-question" },
];

export function findActionableJobs(jobs: SkippedJob[], limit: number): ActionableJob[] {
  const actionable: ActionableJob[] = [];

  for (const job of jobs) {
    const reason = job.skipReason ?? "";
    const match = HUMAN_CLEARABLE.find((candidate) => reason.startsWith(candidate.prefix));
    if (match) {
      actionable.push({ ...job, blockedBy: match.blockedBy });
    }
  }

  // Newest first: a stale posting is likelier to be filled, so the freshest are worth the minutes.
  return actionable.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, limit);
}
