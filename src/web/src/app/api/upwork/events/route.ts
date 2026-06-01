import { getActiveProfileId } from "@/server/active-profile";
import { upworkChannel } from "@/lib/sse/channels/upwork";
import { sseResponse, subscribe } from "@/lib/sse/server";

export async function GET() {
  const profileId = await getActiveProfileId();
  return sseResponse(subscribe(upworkChannel, { profileId }));
}
