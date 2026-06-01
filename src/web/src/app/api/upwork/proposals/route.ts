import { z } from "zod/v4";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { createUpworkProposalSchema } from "@/lib/contracts/upwork";
import { upworkChannel } from "@/lib/sse/channels/upwork";
import { publish } from "@/lib/sse/server";
import { api } from "@/server/api/route";
import { serializeProposal } from "@/utils/upwork";

const querySchema = z.object({
  status: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

export const GET = api.profileRoute({ query: querySchema }, async ({ query, profileId }) => {
  const { status, search } = query;

  const where: Prisma.UpworkProposalWhereInput = { profileId };
  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [{ jobTitle: { contains: search } }, { clientName: { contains: search } }];
  }

  const proposals = await db.upworkProposal.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  return proposals.map(serializeProposal);
});

export const POST = api.profileRoute(
  { body: createUpworkProposalSchema },
  async ({ body, profileId }) => {
    const proposal = await db.upworkProposal.create({
      data: {
        profileId,
        jobTitle: body.jobTitle,
        clientName: body.clientName ?? null,
        jobUrl: body.jobUrl ?? null,
        jobDescription: body.jobDescription ?? null,
        proposalText: body.proposalText ?? "",
        screeningAnswers: JSON.stringify(body.screeningAnswers ?? []),
        status: body.status ?? "draft",
        notes: body.notes ?? null,
      },
    });

    publish(upworkChannel, { profileId }, { type: "proposal.created", id: proposal.id });

    return serializeProposal(proposal);
  },
);
