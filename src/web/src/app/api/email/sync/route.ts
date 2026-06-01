import { api } from "@/server/api/route";
import { syncInbox } from "@/server/email/sync";

export const POST = api.profileRoute({}, ({ profileId }) => syncInbox(profileId));
