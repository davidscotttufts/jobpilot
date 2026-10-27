import type { Data } from "@jobpilot/api-client";
import type { api } from "@/api/client";

/** Per-user Google OAuth client config status, from `GET /api/email/oauth/client`. */
export type OAuthClientStatus = Data<typeof api.email.oauth.client.get>;

/** An inbox message, from `GET /api/email/messages`. */
export type EmailMessageDto = Data<typeof api.email.messages.get>["items"][number];
