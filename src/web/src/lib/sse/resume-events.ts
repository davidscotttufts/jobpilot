import type { ResumeEvent } from "./resume-events.types";
import { createSseBroker } from "./sse-broker";

const resumeEvents = createSseBroker<ResumeEvent>();

function topicFor(resumeId: number): string {
  return `resume:${resumeId}`;
}

export function publishResumeEvent(resumeId: number, event: ResumeEvent): void {
  resumeEvents.publish(topicFor(resumeId), event);
}

export function subscribeToResume(resumeId: number): ReadableStream<Uint8Array> {
  return resumeEvents.subscribe(topicFor(resumeId));
}
