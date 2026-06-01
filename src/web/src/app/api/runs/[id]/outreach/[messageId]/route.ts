import { getActiveProfileId } from "@/lib/active-profile";
import { parsePathParams, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { recomputeOutreachSummary } from "@/lib/runs/summary";
import { patchOutreachMessageSchema } from "@/lib/schemas/outreach";

type Params = ApiRouteContext<{ id: string; messageId: string }>;

/**
 * Non-terminal edits to an outreach message — draft body/subject edits,
 * `draft → approved`, and (via `contactLinkedinConnection`) the parent
 * contact's connection state. Terminal outcomes go through `/result`.
 */
export async function PATCH(req: Request, ctx: Params) {
  const { id: runId, messageId } = await parsePathParams(ctx);
  const mid = Number(messageId);
  if (!Number.isInteger(mid)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid messageId", 400);
  }

  const body = await req.json();
  const parsed = patchOutreachMessageSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid patch payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.outreachMessage.findFirst({
    where: { id: mid, runId, profileId },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Outreach message not found", 404);
  }

  const { contactLinkedinConnection, ...fields } = parsed.data;

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.outreachMessage.update({
      where: { id: mid },
      data: {
        status: fields.status,
        subject: fields.subject,
        body: fields.body,
        failReason: fields.failReason,
        providerId: fields.providerId,
        threadId: fields.threadId,
      },
      include: { contact: true },
    });

    if (contactLinkedinConnection) {
      await tx.contact.update({
        where: { id: updated.contactId },
        data: { linkedinConnection: contactLinkedinConnection },
      });
      updated.contact.linkedinConnection = contactLinkedinConnection;
    }

    if (fields.status) {
      await recomputeOutreachSummary(tx, runId);
    }
    return updated;
  });

  return ok(result);
}
