import { z } from "zod/v4";
import { db } from "@/server/db";
import { createContactPayload } from "@/server/outreach/contact";
import { recomputeOutreachSummary } from "@/server/runs/summary";
import { addRunOutreachSchema } from "@/lib/contracts/outreach";
import { notFound } from "@/server/api/errors";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";

const runParams = z.object({ id: z.string() });

/** List the campaign's outreach messages (with their contacts) for the board. */
export const GET = api.profileRoute({ params: runParams }, ({ params, profileId }) =>
  db.outreachMessage.findMany({
    where: { runId: params.id, profileId },
    include: { contact: true },
    orderBy: { id: "asc" },
  }),
);

/**
 * Add a discovered contact (or attach to an existing `contactId`) plus an
 * initial draft message to the campaign, then recompute the run summary.
 * Mirrors the runs/[id]/jobs create shape.
 */
export const POST = api.profileRoute(
  { params: runParams, body: addRunOutreachSchema },
  async ({ params, body, profileId }) => {
    const { id } = params;
    await findOwned(
      (where) => db.run.findFirst({ where, select: { runId: true } }),
      { runId: id, profileId },
      "Run",
    );

    const { contact, contactId, message } = body;

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
      throw notFound("Contact not found");
    }

    return result.outreachMessage;
  },
);
