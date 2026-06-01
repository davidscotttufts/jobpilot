import { getActiveProfileId } from "@/lib/active-profile";
import { parsePathParams, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { recomputeOutreachSummary } from "@/lib/runs/summary";
import { outreachMessageResultSchema } from "@/lib/schemas/outreach";

type Params = ApiRouteContext<{ id: string; messageId: string }>;

/**
 * Terminal-outcome handoff for an outreach message: marks it `sent`/`failed`/
 * `skipped`, stamps `sentAt` + the Gmail `providerId`/`threadId` (so the reply
 * linker can match a reply later), and recomputes the campaign summary.
 * Mirrors runs/[id]/jobs/[key]/result.
 */
export async function POST(req: Request, ctx: Params) {
  const { id: runId, messageId } = await parsePathParams(ctx);
  const mid = Number(messageId);
  if (!Number.isInteger(mid)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid messageId", 400);
  }

  const body = await req.json();
  const parsed = outreachMessageResultSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid result payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.outreachMessage.findFirst({
    where: { id: mid, runId, profileId },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Outreach message not found", 404);
  }

  const data = parsed.data;
  const sentAt =
    data.outcome === "sent" ? (data.sentAt ? new Date(data.sentAt) : new Date()) : null;

  const result = await db.$transaction(async (tx) => {
    const message = await tx.outreachMessage.update({
      where: { id: mid },
      data: {
        status: data.outcome,
        sentAt,
        providerId: data.outcome === "sent" ? (data.providerId ?? existing.providerId) : null,
        threadId: data.outcome === "sent" ? (data.threadId ?? existing.threadId) : existing.threadId,
        failReason: data.outcome === "failed" ? data.failReason : null,
      },
      include: { contact: true },
    });
    const summary = await recomputeOutreachSummary(tx, runId);
    return { message, summary };
  });

  return ok({ message: result.message, summary: result.summary });
}
