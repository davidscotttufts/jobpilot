import type {
  CampaignActor,
  CampaignJobStatus,
  CampaignStatus,
} from "@jobpilot/contracts/campaign";

/** Actor names as shown in status attributions ("Paused by you / the agent / the pilot"). */
export const CAMPAIGN_ACTOR_LABEL: Record<CampaignActor, string> = {
  user: "you",
  agent: "the agent",
  pilot: "the pilot",
};

export const CAMPAIGN_STATUS_COLOR: Record<
  CampaignStatus,
  "default" | "info" | "success" | "error" | "warning"
> = {
  in_progress: "info",
  paused: "default",
  completed: "success",
  failed: "error",
};

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  in_progress: "in progress",
  paused: "paused",
  completed: "completed",
  failed: "failed",
};

export const CAMPAIGN_JOB_STATUS_COLOR: Record<
  CampaignJobStatus,
  "default" | "info" | "primary" | "success" | "error" | "warning"
> = {
  pending: "default",
  approved: "info",
  applying: "primary",
  needs_user: "warning",
  applied: "success",
  failed: "error",
  skipped: "warning",
};
