import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { approveSchema } from "@/lib/schemas/email";
import { inboxChannel } from "@/lib/sse/channels/inbox";
import { publish } from "@/lib/sse/server";

type Params = ApiRouteContext<{ id: string }>;

const POSITIVE_STAGES = new Set([
  "recruiter_screen",
  "assessment",
  "hiring_manager_screen",
  "technical_interview",
  "onsite",
  "offer",
]);

const CLASSIFICATION_TO_STAGE: Record<string, string> = {
  interviewing: "recruiter_screen",
  rejected: "rejected",
  offer: "offer",
};

export async function POST(req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = approveSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid approve payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const message = await db.emailMessage.findFirst({
    where: { id, account: { profileId } },
  });

  if (!message) {
    return err(ErrorCodes.NOT_FOUND, "Message not found", 404);
  }
  if (!message.matchedAppId) {
    return err(ErrorCodes.UNPROCESSABLE, "Message has no matched application", 422);
  }

  const inferred =
    parsed.data.toStage ??
    message.appliedStage ??
    (message.classification ? CLASSIFICATION_TO_STAGE[message.classification] : undefined);

  if (!inferred) {
    return err(ErrorCodes.UNPROCESSABLE, "No target stage available", 422);
  }

  const app = await db.application.findFirst({
    where: { id: message.matchedAppId, profileId },
  });
  if (!app) {
    return err(ErrorCodes.NOT_FOUND, "Application not found", 404);
  }

  const fromStage = app.stage;
  const toStage = inferred;
  const outcome =
    toStage === "rejected" ? "negative" : POSITIVE_STAGES.has(toStage) ? "positive" : null;
  const rejectedAt = toStage === "rejected" ? new Date() : null;

  await db.$transaction([
    db.application.update({
      where: { id: app.id },
      data: { stage: toStage, outcome, rejectedAt },
    }),
    db.stageEvent.create({
      data: {
        applicationId: app.id,
        fromStage,
        toStage,
        note: parsed.data.note ?? `From email: ${message.subject}`,
      },
    }),
    db.emailMessage.update({
      where: { id },
      data: { reviewStatus: "approved", appliedStage: toStage },
    }),
  ]);

  publish(inboxChannel, undefined, { type: "message.reviewed", id, status: "approved" });

  return ok({ id, applicationId: app.id, stage: toStage });
}
