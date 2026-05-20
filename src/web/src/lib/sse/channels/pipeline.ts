import { defineChannel } from "../channel";

export type PipelineEvent =
  | { type: "run.updated"; runId: string; status?: string; source?: string }
  | { type: "run.completed"; runId: string }
  | { type: "runjob.created"; runId: string; jobKey: string }
  | { type: "runjob.updated"; runId: string; jobKey: string; status?: string }
  | { type: "application.created"; runId: string | null }
  | { type: "queue.updated" };

/**
 * Profile-scoped feed for cross-run UI (kanban, auto-apply pill). The client
 * URL is parameter-free; the server resolves the profile from the session.
 */
export const pipelineChannel = defineChannel<PipelineEvent, void, { profileId: number }>({
  name: "pipeline",
  url: () => "/api/pipeline/events",
  topic: ({ profileId }) => String(profileId),
});
