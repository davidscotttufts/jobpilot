import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { inboxChannel } from "@/lib/sse/channels/inbox";
import { publish } from "@/lib/sse/server";

type Params = ApiRouteContext<{ id: string }>;

export async function POST(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const owned = await db.emailMessage.findFirst({
    where: { id, account: { profileId } },
    select: { id: true },
  });
  if (!owned) {
    return err(ErrorCodes.NOT_FOUND, "Message not found", 404);
  }

  await db.emailMessage.update({
    where: { id },
    data: { reviewStatus: "denied" },
  });

  publish(inboxChannel, undefined, { type: "message.reviewed", id, status: "denied" });

  return ok({ id, status: "denied" });
}
