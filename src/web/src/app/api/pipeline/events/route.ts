import { getActiveProfileId } from "@/lib/active-profile";
import { subscribeToProfile } from "@/lib/sse";

export async function GET() {
  const profileId = await getActiveProfileId();
  const stream = subscribeToProfile(profileId);
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
