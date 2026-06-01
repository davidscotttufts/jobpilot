import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { sseResponse, subscribe } from "@/lib/sse/server";
import { api } from "@/server/api/route";

export const GET = api.profileRoute({}, ({ profileId }) =>
  sseResponse(subscribe(pipelineChannel, { profileId })),
);
