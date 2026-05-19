import { inboxChannel } from "@/lib/sse/channels/inbox";
import { sseResponse, subscribe } from "@/lib/sse/server";

export async function GET() {
  return sseResponse(subscribe(inboxChannel, undefined));
}
