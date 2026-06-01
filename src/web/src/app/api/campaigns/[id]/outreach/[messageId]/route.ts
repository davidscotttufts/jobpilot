import { z } from "zod/v4";
import { patchOutreachMessageSchema } from "@/lib/contracts/outreach";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";
import { recomputeOutreachSummary } from "@/server/campaigns/summary";
import { db } from "@/server/db";

const outreachMessageParams = z.object({
  id: z.string(),
  messageId: z.coerce.number().int().positive(),
});

/**
 * Non-terminal edits to an outreach message — draft body/subject edits,
 * `draft → approved`, and (via `contactLinkedinConnection`) the parent
 * contact's connection state. Terminal outcomes go through `/result`.
 */
export const PATCH = api.profileRoute(
  { params: outreachMessageParams, body: patchOutreachMessageSchema },
  async ({ params, body, profileId }) => {
    const { id: campaignId, messageId } = params;

    await findOwned(
      (where) => db.outreachMessage.findFirst({ where, select: { id: true } }),
      { id: messageId, campaignId, profileId },
      "Outreach message",
    );

    const { contactLinkedinConnection, ...fields } = body;

    return db.$transaction(async (tx) => {
      const updated = await tx.outreachMessage.update({
        where: { id: messageId },
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
        await recomputeOutreachSummary(tx, campaignId);
      }
      return updated;
    });
  },
);
