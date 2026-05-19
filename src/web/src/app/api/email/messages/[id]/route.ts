import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { scanMessageSchema } from "@/lib/schemas/email";
import { inboxChannel } from "@/lib/sse/channels/inbox";
import { publish } from "@/lib/sse/server";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const message = await db.emailMessage.findFirst({
    where: { id, account: { profileId } },
    include: {
      matchedApp: { select: { id: true, title: true, company: true, stage: true } },
    },
  });
  if (!message) {
    return err(ErrorCodes.NOT_FOUND, "Message not found", 404);
  }
  return ok(message);
}

export async function PATCH(req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const body = await req.json();
  const parsed = scanMessageSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid scan payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const owned = await db.emailMessage.findFirst({
    where: { id, account: { profileId } },
    select: { id: true },
  });
  if (!owned) {
    return err(ErrorCodes.NOT_FOUND, "Message not found", 404);
  }

  const data = parsed.data;
  const message = await db.emailMessage.update({
    where: { id },
    data: {
      classification: data.classification,
      confidence: data.confidence,
      reasoning: data.reasoning,
      matchedAppId: data.matchedAppId,
      matchScore: data.matchScore,
      appliedStage: data.appliedStage,
      reviewStatus: data.reviewStatus,
      verificationCode: data.verificationCode,
      verificationLink: data.verificationLink,
      verificationDomain: data.verificationDomain,
      scannedAt: data.classification ? new Date() : undefined,
    },
  });

  publish(inboxChannel, undefined, { type: "message.scanned", id });

  return ok(message);
}
