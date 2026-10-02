import type { NetworkingMode } from "@jobpilot/contracts/networking";
import type { PilotTask, TaskPayload } from "@jobpilot/contracts/pilot";
import type { TaskJob } from "./gather-jobs";
import { jobSubjectId } from "./runs";

// job.apply adds its matchScore to jobBase, so a perfect match reaches 900.
const PRIORITY = {
  question: 1000,
  interviewReply: 950,
  // Above any apply: probe a failing board before more attempts pile onto it.
  boardDiagnose: 920,
  // Above any apply, or a full apply task list would starve a stranded campaign out of the top 10.
  reviewPaused: 910,
  jobBase: 800,
  interviewPrep: 750,
  queueScore: 720,
  networkingSend: 700,
  inboxReview: 650,
  upworkSync: 640,
  promotionPost: 600,
  warmIntro: 550,
  strategySetup: 520,
  // Finish scoring what was found before discovering more.
  scorePending: 510,
  discover: 500,
  followup: 400,
  strategyReview: 350,
  promotionDraft: 300,
  rescanSkipped: 250,
  retryFailed: 240,
} as const;

export const questionTask = (payload: TaskPayload<"question.answered">): PilotTask => ({
  id: `question.answered:${payload.questionId}`,
  taskType: "question.answered",
  priority: PRIORITY.question,
  title: `Apply answer: ${payload.prompt}`,
  subjectType: "question",
  subjectId: payload.questionId,
  payload,
});

export const applyTask = (job: TaskJob): PilotTask => ({
  id: `job.apply:${jobSubjectId(job)}`,
  taskType: "job.apply",
  priority: PRIORITY.jobBase + (job.matchScore ?? 0),
  title: job.title,
  subjectType: "job",
  subjectId: jobSubjectId(job),
  payload: {
    campaignId: job.campaignId,
    jobKey: job.key,
    url: job.url,
    board: job.board,
    digest: job.digest,
    resumeId: job.resumeId,
    matchScore: job.matchScore,
    warmContacts: job.warmContacts,
  },
});

/** An empty contact list still earns the task: the worker finding a first contact is the point. */
export const warmIntroTask = (job: TaskJob, mode: NetworkingMode): PilotTask => ({
  id: `networking.warmIntro:${jobSubjectId(job)}`,
  taskType: "networking.warmIntro",
  priority: PRIORITY.warmIntro,
  title: `Warm intro: ${job.title}`,
  subjectType: "networking",
  subjectId: jobSubjectId(job),
  payload: {
    campaignId: job.campaignId,
    jobKey: job.key,
    company: job.company,
    jobTitle: job.title,
    jobUrl: job.url,
    contacts: job.warmContacts ?? [],
    ...mode,
  },
});

export const discoverTask = (payload: TaskPayload<"search.discover">): PilotTask => ({
  id: `search.discover:${payload.searchId}`,
  taskType: "search.discover",
  priority: PRIORITY.discover,
  title: `Discover: ${payload.query}`,
  subjectType: "campaign",
  subjectId: payload.searchId,
  payload,
});

export const scorePendingTask = (payload: TaskPayload<"campaign.scorePending">): PilotTask => ({
  id: `campaign.scorePending:${payload.campaignId}`,
  taskType: "campaign.scorePending",
  priority: PRIORITY.scorePending,
  title: `Score discovered jobs: ${payload.query}`,
  subjectType: "campaign",
  subjectId: payload.campaignId,
  payload,
});

export const reviewPausedTask = (payload: TaskPayload<"campaign.reviewPaused">): PilotTask => ({
  id: `campaign.reviewPaused:${payload.campaignId}`,
  taskType: "campaign.reviewPaused",
  priority: PRIORITY.reviewPaused,
  title: `Review paused campaign: ${payload.query}`,
  subjectType: "campaign",
  subjectId: payload.campaignId,
  payload,
});

export const queueScoreTask = (payload: TaskPayload<"queue.score">): PilotTask => ({
  id: `queue.score:${payload.campaignId}`,
  taskType: "queue.score",
  priority: PRIORITY.queueScore,
  title: `Score ${payload.queuedCount} pasted link(s)`,
  subjectType: "campaign",
  subjectId: payload.campaignId,
  payload,
});

export const networkingSendTask = (payload: TaskPayload<"networking.send">): PilotTask => ({
  id: `networking.send:${payload.messageId}`,
  taskType: "networking.send",
  priority: PRIORITY.networkingSend,
  title: `Send networking message: ${payload.contactName}`,
  subjectType: "networking",
  subjectId: payload.messageId,
  payload,
});

export const followupTask = (payload: TaskPayload<"networking.followup">): PilotTask => ({
  id: `networking.followup:${payload.messageId}`,
  taskType: "networking.followup",
  priority: PRIORITY.followup,
  title: `Follow up: ${payload.contactName}`,
  subjectType: "networking",
  subjectId: payload.messageId,
  payload,
});

export const inboxTask = (payload: TaskPayload<"inbox.review">): PilotTask => ({
  id: "inbox.review",
  taskType: "inbox.review",
  priority: PRIORITY.inboxReview,
  title: `Review ${payload.count} inbox message(s)`,
  subjectType: "inbox",
  subjectId: "inbox",
  payload,
});

export const interviewReplyTask = (payload: TaskPayload<"interview.reply">): PilotTask => ({
  id: `interview.reply:${payload.emailMessageId}`,
  taskType: "interview.reply",
  priority: PRIORITY.interviewReply,
  title: `Reply to interview invite: ${payload.company}`,
  subjectType: "email",
  subjectId: payload.emailMessageId,
  payload,
});

export const interviewPrepTask = (payload: TaskPayload<"interview.prep">): PilotTask => ({
  id: `interview.prep:${payload.applicationId}`,
  taskType: "interview.prep",
  priority: PRIORITY.interviewPrep,
  title: `Interview prep: ${payload.jobTitle}`,
  subjectType: "application",
  subjectId: payload.applicationId,
  payload,
});

export const promotionPostTask = (payload: TaskPayload<"promotion.post">): PilotTask => ({
  id: `promotion.post:${payload.promotionId}`,
  taskType: "promotion.post",
  priority: PRIORITY.promotionPost,
  title: `Post to ${payload.platform}`,
  subjectType: "promotion",
  subjectId: payload.promotionId,
  payload,
});

export const promotionDraftTask = (payload: TaskPayload<"promotion.draft">): PilotTask => ({
  id: `promotion.draft:${payload.platform}`,
  taskType: "promotion.draft",
  priority: PRIORITY.promotionDraft,
  title: `Draft post: ${payload.platform}`,
  subjectType: "promotion",
  subjectId: `platform:${payload.platform}`,
  payload,
});

export const upworkSyncTask = (payload: TaskPayload<"upwork.syncInbox">): PilotTask => ({
  id: "upwork.syncInbox",
  taskType: "upwork.syncInbox",
  priority: PRIORITY.upworkSync,
  title: payload.lastSyncedAt ? "Refresh the Upwork inbox" : "Pull the Upwork inbox",
  subjectType: "upwork",
  subjectId: "inbox",
  payload,
});

export const boardDiagnoseTask = (payload: TaskPayload<"board.diagnose">): PilotTask => ({
  id: `board.diagnose:${payload.board}`,
  taskType: "board.diagnose",
  priority: PRIORITY.boardDiagnose,
  title: `Board failing: ${payload.board} (${payload.consecutiveFailures})`,
  subjectType: "board",
  subjectId: payload.board,
  payload,
});

export const strategyReviewTask = (payload: TaskPayload<"campaign.strategyReview">): PilotTask => ({
  id: `campaign.strategyReview:${payload.campaignId}`,
  taskType: "campaign.strategyReview",
  priority: PRIORITY.strategyReview,
  title: `Review strategy: ${payload.query}`,
  subjectType: "campaign",
  subjectId: payload.campaignId,
  payload,
});

export const rescanSkippedTask = (payload: TaskPayload<"job.rescanSkipped">): PilotTask => ({
  id: `job.rescanSkipped:${payload.campaignId}`,
  taskType: "job.rescanSkipped",
  priority: PRIORITY.rescanSkipped,
  title: `Rescan ${payload.skippedCount} skipped job(s)`,
  subjectType: "campaign",
  subjectId: payload.campaignId,
  payload,
});

export const retryFailedTask = (payload: TaskPayload<"job.retryFailed">): PilotTask => ({
  id: `job.retryFailed:${payload.campaignId}`,
  taskType: "job.retryFailed",
  priority: PRIORITY.retryFailed,
  title: `Retry ${payload.failedCount} failed job(s)`,
  subjectType: "campaign",
  subjectId: payload.campaignId,
  payload,
});

export const setupTask = (payload: TaskPayload<"strategy.setup">): PilotTask => ({
  id: "strategy.setup",
  taskType: "strategy.setup",
  priority: PRIORITY.strategySetup,
  title: "Set up searches from your goals",
  subjectType: "pilot",
  subjectId: "setup",
  payload,
});
