import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { publishInboxEvent } from "@/lib/sse/inbox-events";

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

  publishInboxEvent({ type: "message.reviewed", id, status: "denied" });

  return ok({ id, status: "denied" });
}
