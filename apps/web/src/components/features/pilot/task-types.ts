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
  "campaign.strategyReview": "Review campaign strategy",
  "job.rescanSkipped": "Rescan skipped jobs",
  "job.retryFailed": "Retry failed jobs",
  "strategy.setup": "Set up goals and saved searches",
  "upwork.syncInbox": "Refresh the Upwork inbox",
};

/** Falls back to the raw type: cost history still holds types the task list no longer emits. */
export function taskTypeLabel(taskType: string): string {
  return (TASK_TYPE_LABELS as Record<string, string | undefined>)[taskType] ?? taskType;
}
