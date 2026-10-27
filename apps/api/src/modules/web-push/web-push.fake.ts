import type { PushPayload, WebPushService } from "./web-push.service";

export type SentPush = { userId: string; payload: PushPayload };

/** Fake WebPushService recording sendToUser calls without any web-push/env dependency. */
export function makePush(pushes: SentPush[]): WebPushService {
  return {
    sendToUser: async (userId: string, payload: PushPayload) => {
      pushes.push({ userId, payload });
    },
  } as unknown as WebPushService;
}
