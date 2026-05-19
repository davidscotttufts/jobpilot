import { defineChannel } from "../channel";

export type RunEvent =
  | { type: "log"; payload: Record<string, unknown> }
  | { type: "progress"; payload: Record<string, unknown> }
  | { type: "status"; payload: { status: string } }
  | { type: "job-update"; payload: { kind: "added" | "updated"; job: unknown } };

/** Live event feed scoped to a single run (logs, progress, job updates). */
export const runChannel = defineChannel<RunEvent, { runId: string }>({
  name: "run",
  url: ({ runId }) => `/api/runs/${encodeURIComponent(runId)}/events`,
  topic: ({ runId }) => runId,
});
