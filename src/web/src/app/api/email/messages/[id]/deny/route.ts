import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { type ApiRouteContext, parsePathParams } from "@/lib/api/request";
import { db } from "@/lib/db";
import { publishInboxEvent } from "@/lib/sse/inbox-events";

type Params = ApiRouteContext<{ id: string }>;

export async function POST(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const msgId = Number(id);
  if (!Number.isInteger(msgId)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid id", 400);
  }

  const profileId = await getActiveProfileId();
  const owned = await db.emailMessage.findFirst({
    where: { id: msgId, account: { profileId } },
    select: { id: true },
  });
  if (!owned) {
    return err(ErrorCodes.NOT_FOUND, "Message not found", 404);
  }

  await db.emailMessage.update({
    where: { id: msgId },
    data: { reviewStatus: "denied" },
  });

  publishInboxEvent({ type: "message.reviewed", id: msgId, status: "denied" });

  return ok({ id: msgId, status: "denied" });
}
