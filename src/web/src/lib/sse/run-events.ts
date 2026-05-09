import { createSseBroker } from "./sse-broker";

const runEvents = createSseBroker<unknown>();

/** Publish a run event to all clients watching the given run. */
export function publishRunEvent(runId: string, event: unknown): void {
  runEvents.publish(runId, event);
}

/** Subscribe to live events for a single run. */
export function subscribeToRun(runId: string): ReadableStream<Uint8Array> {
  return runEvents.subscribe(runId);
}
