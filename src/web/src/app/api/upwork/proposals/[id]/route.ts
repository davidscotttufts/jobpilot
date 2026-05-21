import type { Prisma } from "@/generated/prisma/client";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { patchUpworkProposalSchema } from "@/lib/schemas/upwork";
import { upworkChannel } from "@/lib/sse/channels/upwork";
import { publish } from "@/lib/sse/server";
import { serializeProposal } from "@/utils/upwork";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const proposal = await db.upworkProposal.findFirst({ where: { id, profileId } });

  if (!proposal) {
    return err(ErrorCodes.NOT_FOUND, "Proposal not found", 404);
  }

  return ok(serializeProposal(proposal));
}

export async function PATCH(req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const body = await req.json();
  const parsed = patchUpworkProposalSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid proposal patch", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.upworkProposal.findFirst({ where: { id, profileId } });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Proposal not found", 404);
  }

  const data = parsed.data;
  const update: Prisma.UpworkProposalUpdateInput = {
    jobTitle: data.jobTitle,
    clientName: data.clientName,
    jobUrl: data.jobUrl,
    jobDescription: data.jobDescription,
    proposalText: data.proposalText,
    status: data.status,
    outcome: data.outcome,
    notes: data.notes,
  };

  if (data.screeningAnswers !== undefined) {
    update.screeningAnswers = JSON.stringify(data.screeningAnswers);
  }

  if (data.submittedAt !== undefined) {
    update.submittedAt = data.submittedAt ? new Date(data.submittedAt) : null;
  } else if (data.status === "submitted" && !existing.submittedAt) {
    update.submittedAt = new Date();
  }

  const proposal = await db.upworkProposal.update({ where: { id }, data: update });

  publish(upworkChannel, { profileId }, { type: "proposal.updated", id });

  return ok(serializeProposal(proposal));
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const existing = await db.upworkProposal.findFirst({ where: { id, profileId } });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Proposal not found", 404);
  }

  await db.upworkProposal.delete({ where: { id } });

  publish(upworkChannel, { profileId }, { type: "proposal.deleted", id });

  return ok({ id });
}
