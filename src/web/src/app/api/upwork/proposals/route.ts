import type { Prisma } from "@/generated/prisma/client";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseQueryParams } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { createUpworkProposalSchema } from "@/lib/schemas/upwork";
import { upworkChannel } from "@/lib/sse/channels/upwork";
import { publish } from "@/lib/sse/server";
import { serializeProposal } from "@/utils/upwork";

export async function GET(req: Request) {
  const profileId = await getActiveProfileId();
  const { status, search } = parseQueryParams(req, ["status", "search"] as const);

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

  return ok(proposals.map(serializeProposal));
}

export async function POST(req: Request) {
  const profileId = await getActiveProfileId();
  const body = await req.json();
  const parsed = createUpworkProposalSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid proposal payload", 422, parsed.error.issues);
  }

  const data = parsed.data;
  const proposal = await db.upworkProposal.create({
    data: {
      profileId,
      jobTitle: data.jobTitle,
      clientName: data.clientName ?? null,
      jobUrl: data.jobUrl ?? null,
      jobDescription: data.jobDescription ?? null,
      proposalText: data.proposalText ?? "",
      screeningAnswers: JSON.stringify(data.screeningAnswers ?? []),
      status: data.status ?? "draft",
      notes: data.notes ?? null,
    },
  });

  publish(upworkChannel, { profileId }, { type: "proposal.created", id: proposal.id });

  return ok(serializeProposal(proposal), { status: 201 });
}
