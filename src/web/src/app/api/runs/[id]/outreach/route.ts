import { getActiveProfileId } from "@/lib/active-profile";
import { parsePathParams, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { createContactPayload } from "@/lib/outreach/contact";
import { recomputeOutreachSummary } from "@/lib/runs/summary";
import { addRunOutreachSchema } from "@/lib/schemas/outreach";

type Params = ApiRouteContext<{ id: string }>;

/** List the campaign's outreach messages (with their contacts) for the board. */
export async function GET(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const profileId = await getActiveProfileId();
  const messages = await db.outreachMessage.findMany({
    where: { runId: id, profileId },
    include: { contact: true },
    orderBy: { id: "asc" },
  });
  return ok(messages);
}

/**
 * Add a discovered contact (or attach to an existing `contactId`) plus an
 * initial draft message to the campaign, then recompute the run summary.
 * Mirrors the runs/[id]/jobs create shape.
 */
export async function POST(req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const body = await req.json();
  const parsed = addRunOutreachSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid outreach payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const run = await db.run.findFirst({ where: { runId: id, profileId } });
  if (!run) {
    return err(ErrorCodes.NOT_FOUND, "Run not found", 404);
  }

  const { contact, contactId, message } = parsed.data;

  const result = await db.$transaction(async (tx) => {
    let resolvedContactId = contactId;

    if (resolvedContactId != null) {
      const existing = await tx.contact.findFirst({
        where: { id: resolvedContactId, profileId },
        select: { id: true },
      });
      if (!existing) {
        return null;
      }
    } else if (contact) {
      const created = await tx.contact.create({
        data: { profileId, ...createContactPayload(contact) },
      });
      resolvedContactId = created.id;
    }

    const outreachMessage = await tx.outreachMessage.create({
      data: {
        profileId,
        contactId: resolvedContactId!,
        runId: id,
        channel: message.channel,
        linkedinKind: message.linkedinKind ?? null,
        subject: message.subject ?? null,
        body: message.body,
        status: message.status ?? "draft",
      },
      include: { contact: true },
    });

    const summary = await recomputeOutreachSummary(tx, id);
    return { outreachMessage, summary };
  });

  if (!result) {
    return err(ErrorCodes.NOT_FOUND, "Contact not found", 404);
  }

  return ok(result.outreachMessage, { status: 201 });
}
