import { createSseBroker } from "./sse-broker";

export const INBOX_TOPIC = "inbox";

export type InboxEvent =
  | { type: "sync.started" }
  | { type: "sync.progress"; fetched: number; new: number }
  | { type: "message.scanned"; id: number }
  | { type: "message.reviewed"; id: number; status: "approved" | "denied" };

const inboxEvents = createSseBroker<InboxEvent>();

export function publishInboxEvent(event: InboxEvent): void {
  inboxEvents.publish(INBOX_TOPIC, event);
}

export function subscribeToInbox(): ReadableStream<Uint8Array> {
  return inboxEvents.subscribe(INBOX_TOPIC);
}
