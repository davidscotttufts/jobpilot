import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { idParam } from "@/lib/contracts/shared";
import { patchUpworkProposalSchema } from "@/lib/contracts/upwork";
import { upworkChannel } from "@/lib/sse/channels/upwork";
import { publish } from "@/lib/sse/server";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";
import { serializeProposal } from "@/utils/upwork";

export const GET = api.profileRoute({ params: idParam }, async ({ params, profileId }) => {
  const proposal = await findOwned(
    (where) => db.upworkProposal.findFirst({ where }),
    { id: params.id, profileId },
    "Proposal",
  );

  return serializeProposal(proposal);
});

export const PATCH = api.profileRoute(
  { params: idParam, body: patchUpworkProposalSchema },
  async ({ params, body, profileId }) => {
    const { id } = params;
    const existing = await findOwned(
      (where) => db.upworkProposal.findFirst({ where }),
      { id, profileId },
      "Proposal",
    );

    const update: Prisma.UpworkProposalUpdateInput = {
      jobTitle: body.jobTitle,
      clientName: body.clientName,
      jobUrl: body.jobUrl,
      jobDescription: body.jobDescription,
      proposalText: body.proposalText,
      status: body.status,
      outcome: body.outcome,
      notes: body.notes,
    };

    if (body.screeningAnswers !== undefined) {
      update.screeningAnswers = JSON.stringify(body.screeningAnswers);
    }

    if (body.submittedAt !== undefined) {
      update.submittedAt = body.submittedAt ? new Date(body.submittedAt) : null;
    } else if (body.status === "submitted" && !existing.submittedAt) {
      update.submittedAt = new Date();
    }

    const proposal = await db.upworkProposal.update({ where: { id }, data: update });

    publish(upworkChannel, { profileId }, { type: "proposal.updated", id });

    return serializeProposal(proposal);
  },
);

export const DELETE = api.profileRoute({ params: idParam }, async ({ params, profileId }) => {
  const { id } = params;
  await findOwned(
    (where) => db.upworkProposal.findFirst({ where, select: { id: true } }),
    { id, profileId },
    "Proposal",
  );

  await db.upworkProposal.delete({ where: { id } });

  publish(upworkChannel, { profileId }, { type: "proposal.deleted", id });

  return { id };
});
