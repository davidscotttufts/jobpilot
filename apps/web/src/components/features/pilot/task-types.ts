import type { TaskType } from "@jobpilot/contracts/pilot";

/** Required record: a new task type fails typecheck until it gets a label. */
const TASK_TYPE_LABELS: Record<TaskType, string> = {
  "question.answered": "Act on answered question",
  "job.apply": "Apply to job",
  "search.discover": "Run saved search",
  "campaign.scorePending": "Score discovered jobs",
  "campaign.reviewPaused": "Review paused campaign",
  "inbox.review": "Review inbox email",
  "networking.send": "Send networking message",
  "networking.followup": "Follow up on networking message",
  "networking.warmIntro": "Ask for a warm intro",
  "promotion.draft": "Draft promotion post",
  "promotion.post": "Publish promotion post",
  "interview.reply": "Reply about an interview",
  "interview.prep": "Prepare interview notes",
  "queue.score": "Score pasted links",
  "board.diagnose": "Diagnose job board",
  "campaign.tune": "Tune a campaign",
  "job.rescanSkipped": "Rescan skipped jobs",
  "job.retryFailed": "Retry failed jobs",
  "search.setup": "Set up goals and saved searches",
  "upwork.syncInbox": "Refresh the Upwork inbox",
};

/** Falls back to the raw type: cost history still holds types the task list no longer emits. */
export function taskTypeLabel(taskType: string): string {
  return (TASK_TYPE_LABELS as Record<string, string | undefined>)[taskType] ?? taskType;
}

/** Who does a task's work: one of the plugin's agents, or the pilot session itself for text-only work. */
export type PilotAgent =
  | "job-searcher"
  | "job-scorer"
  | "job-applier"
  | "networking-worker"
  | "session";

/** Required record, like the labels: matches plugin/skills/pilot/tasks/*.md delegations. */
const TASK_TYPE_AGENTS: Record<TaskType, PilotAgent> = {
  "question.answered": "job-applier",
  "job.apply": "job-applier",
  "search.discover": "job-searcher",
  "campaign.scorePending": "job-scorer",
  "campaign.reviewPaused": "session",
  "inbox.review": "session",
  "networking.send": "session",
  "networking.followup": "session",
  "networking.warmIntro": "networking-worker",
  "promotion.draft": "session",
  "promotion.post": "session",
  "interview.reply": "session",
  "interview.prep": "session",
  "queue.score": "job-scorer",
  "board.diagnose": "job-applier",
  "campaign.tune": "session",
  "job.rescanSkipped": "session",
  "job.retryFailed": "session",
  "search.setup": "session",
  "upwork.syncInbox": "session",
};

export const AGENT_LABELS: Record<PilotAgent, string> = {
  "job-searcher": "Searcher",
  "job-scorer": "Scorer",
  "job-applier": "Applier",
  "networking-worker": "Networker",
  session: "Session",
};

/** Falls back to the session for task types the task list no longer emits. */
export function taskTypeAgent(taskType: string): PilotAgent {
  return (TASK_TYPE_AGENTS as Record<string, PilotAgent | undefined>)[taskType] ?? "session";
}
