import { db } from "@/lib/db";
import { createSseBroker } from "./sse-broker";

export const PIPELINE_EVENTS_URL = "/api/pipeline/events";

export type PipelineEvent =
  | { type: "run.updated"; runId: string; status?: string; source?: string }
  | { type: "run.completed"; runId: string }
  | { type: "runjob.created"; runId: string; jobKey: string }
  | { type: "runjob.updated"; runId: string; jobKey: string; status?: string }
  | { type: "application.created"; runId: string | null }
  | { type: "queue.updated" };

const runEvents = createSseBroker<unknown>();
const profileEvents = createSseBroker<PipelineEvent>();

const MAX_RUN_PROFILE_CACHE = 500;
const runProfileCache = new Map<string, number>();

async function resolveProfileId(runId: string): Promise<number | null> {
  const cached = runProfileCache.get(runId);
  if (cached != null) {
    return cached;
  }

  const run = await db.run.findUnique({
    where: { runId },
    select: { profileId: true },
  });

  if (!run) {
    return null;
  }

  if (runProfileCache.size >= MAX_RUN_PROFILE_CACHE) {
    const oldest = runProfileCache.keys().next().value;
    if (oldest !== undefined) {
      runProfileCache.delete(oldest);
    }
  }

  runProfileCache.set(runId, run.profileId);
  return run.profileId;
}

/** Publish a run event to all clients watching the given run AND the profile-scoped feed. */
export function publishRunEvent(runId: string, event: unknown): void {
  runEvents.publish(runId, event);
}

/**
 * Publish a structured pipeline event scoped to a single profile. Use this
 * for cross-run UI (kanban, floating stop pill) that should not subscribe to
 * every individual run.
 */
export async function publishPipelineEventFromRun(
  runId: string,
  event: PipelineEvent,
): Promise<void> {
  const profileId = await resolveProfileId(runId);
  if (profileId === null) {
    return;
  }
  profileEvents.publish(String(profileId), event);
}

/** Publish a profile-scoped pipeline event directly. */
export function publishPipelineEvent(profileId: number, event: PipelineEvent): void {
  profileEvents.publish(String(profileId), event);
}

/** Subscribe to live events for a single run. */
export function subscribeToRun(runId: string): ReadableStream<Uint8Array> {
  return runEvents.subscribe(runId);
}

/** Subscribe to the profile-scoped pipeline feed. */
export function subscribeToProfile(profileId: number): ReadableStream<Uint8Array> {
  return profileEvents.subscribe(String(profileId));
}
