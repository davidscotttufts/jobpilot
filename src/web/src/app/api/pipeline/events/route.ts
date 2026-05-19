import { getActiveProfileId } from "@/lib/active-profile";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { sseResponse, subscribe } from "@/lib/sse/server";

export async function GET() {
  const profileId = await getActiveProfileId();
  return sseResponse(subscribe(pipelineChannel, { profileId }));
}
