import type { NetworkingMode } from "@jobpilot/contracts/networking";
import type { AgendaItem, PilotInstructionsConfig } from "@jobpilot/contracts/pilot";
import { MAX_PAUSED_REVIEWS, MAX_WARM_INTROS, PRIORITY, SEARCH_MAX_PAGES } from "./constants";
import { jobSubjectId } from "./job-mutations";
import type {
  AgendaApprovedJob,
  AgendaDueQuery,
  AgendaPausedCampaign,
  AgendaQuestion,
  AgendaScorePending,
} from "./types";

/** Answered questions - the highest-priority "apply the user's answer" work. */
export function buildQuestionItems(questions: AgendaQuestion[]): AgendaItem[] {
  return questions.map((q) => ({
    id: `question.answered:${q.id}`,
    kind: "question.answered",
    priority: PRIORITY.question,
    title: `Apply answer: ${q.prompt}`.slice(0, 200),
    subjectType: "question",
    subjectId: q.id,
    // Enriched with subject + Q/A so the worker can route non-job answers (email replies, networking) directly.
    payload: {
      questionId: q.id,
      questionKind: q.kind,
      subjectType: q.subjectType ?? null,
      subjectId: q.subjectId ?? null,
      prompt: q.prompt,
      answer: q.answer ?? null,
    },
  }));
}

export function buildJobApplyItems(jobs: AgendaApprovedJob[]): AgendaItem[] {
  return jobs.map((job) => {
    const warm = job.warmContacts ?? [];
    return {
      id: `job.apply:${job.campaignId}:${job.key}`,
      kind: "job.apply",
      priority: PRIORITY.jobBase + (job.matchScore ?? 0),
      title: job.title,
      subjectType: "job",
      subjectId: job.key,
      payload: {
        campaignId: job.campaignId,
        jobKey: job.key,
        url: job.url,
        board: job.board,
        digest: job.digest,
        resumeId: job.resumeId,
        matchScore: job.matchScore,
        // Warm contacts ride the apply item so the worker can mention a known insider.
        warmContacts: warm.length > 0 ? warm : undefined,
      },
    };
  });
}

/**
 * Gated on the networking cap, not the apply cap. The pool arrives score-filtered and ranked from
 * gatherWarmIntroCandidates. An empty contact list is no reason to skip: the worker discovering one
 * is how a first contact is created.
 */
export function buildWarmIntroItems(
  jobs: AgendaApprovedJob[],
  mode: NetworkingMode,
  sendsLeft: number,
): AgendaItem[] {
  if (sendsLeft <= 0) return [];

  return jobs.slice(0, MAX_WARM_INTROS).map((job) => ({
    id: `networking.warmIntro:${jobSubjectId(job)}`,
    kind: "networking.warmIntro",
    priority: PRIORITY.warmIntro,
    title: `Warm intro: ${job.title}`.slice(0, 200),
    subjectType: "networking",
    subjectId: jobSubjectId(job),
    payload: {
      campaignId: job.campaignId,
      jobKey: job.key,
      company: job.company ?? null,
      jobTitle: job.title,
      jobUrl: job.url,
      contacts: job.warmContacts ?? [],
      ...mode,
    },
  }));
}

/**
 * Discovery fills the pipeline only when nothing approved is left to apply to (gated by the caller).
 * Item id / claim subject is the search id; `newJobsTarget` and the page cap steer the crawl. The
 * configured boards win over a search's own board, rotating one step per cycle so the pilot doesn't
 * live on whichever board bootstrap picked.
 */
export function buildDiscoverItems(
  queries: AgendaDueQuery[],
  config: PilotInstructionsConfig,
  newJobsTarget: number,
  cycleCount: number,
): AgendaItem[] {
  const { boards } = config;
  const rotated = boards.length > 0 ? boards[cycleCount % boards.length] : undefined;

  return queries.map((q) => ({
    id: `search.discover:${q.searchId}`,
    kind: "search.discover",
    priority: PRIORITY.discover,
    title: `Discover: ${q.query}`,
    subjectType: "campaign",
    subjectId: q.searchId,
    payload: {
      searchId: q.searchId,
      query: q.query,
      board: rotated ?? q.board,
      resumeId: q.resumeId,
      minScore: config.minScore,
      campaignId: q.campaignId,
      newJobsTarget,
      maxPages: SEARCH_MAX_PAGES,
    },
  }));
}

/** Score and enrich an existing campaign's pending rows; ranked above discovery, gated by the caller. */
export function buildScorePendingItems(campaigns: AgendaScorePending[]): AgendaItem[] {
  return campaigns.map((c) => ({
    id: `campaign.scorePending:${c.campaignId}`,
    kind: "campaign.scorePending",
    priority: PRIORITY.scorePending,
    title: `Score discovered jobs: ${c.query}`.slice(0, 200),
    subjectType: "campaign",
    subjectId: c.campaignId,
    payload: { ...c },
  }));
}

/** At most one paused-campaign review per agenda; always emitted (never cap/busy-gated). */
export function buildReviewPausedItems(campaigns: AgendaPausedCampaign[]): AgendaItem[] {
  return campaigns.slice(0, MAX_PAUSED_REVIEWS).map((c) => ({
    id: `campaign.reviewPaused:${c.campaignId}`,
    kind: "campaign.reviewPaused",
    priority: PRIORITY.reviewPaused,
    title: `Review paused campaign: ${c.query}`.slice(0, 200),
    subjectType: "campaign",
    subjectId: c.campaignId,
    payload: { campaignId: c.campaignId, query: c.query, board: c.board, pausedAt: c.pausedAt },
  }));
}
