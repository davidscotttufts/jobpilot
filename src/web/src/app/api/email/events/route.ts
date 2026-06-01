import { inboxChannel } from "@/lib/sse/channels/inbox";
import { sseResponse, subscribe } from "@/lib/sse/server";
import { api } from "@/server/api/route";

export const GET = api.publicRoute({}, () => sseResponse(subscribe(inboxChannel, undefined)));
