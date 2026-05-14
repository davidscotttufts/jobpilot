import { subscribeToInbox } from "@/lib/sse/inbox-events";

export async function GET() {
  const stream = subscribeToInbox();
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
