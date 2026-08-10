import type { Prisma } from "@/generated/prisma/client";

export type RecoveryWriter = Pick<Prisma.TransactionClient, "job" | "pilotQuestion">;

/** Shown on a job parked for review; the agent must not re-apply on its own. */
export const MAYBE_SUBMITTED_REASON =
  "Recovered mid-apply after the form may already have been submitted. Check the employer's site or your email before retrying - re-applying would send a second application.";

/** Answering either way resolves the job; leaving it unanswered lets the sweep skip it, which is safe. */
const ANSWERS = ["It was submitted - mark applied", "It was not submitted - try again"] as const;

/**
 * Returns interrupted `applying` jobs to a workable state without risking a second submission.
 *
 * `submitAttemptedAt` is stamped just before the agent clicks submit, so it splits an interrupted
 * apply into two very different cases. Nothing was sent yet - safe to re-approve and retry, which
 * is what recovery has always done. Something may have been sent - and the duplicate guard cannot
 * see it, because an `Application` row is only written once the *result* is recorded, which is
 * exactly the write that never happened. Auto-retrying that case mails a second application to a
 * real employer and cannot be undone, so it goes to a human instead.
 *
 * Parking also raises a question. `needs_user` is an active status, so a parked job keeps its
 * campaign from finalizing, and nothing else in the agenda surfaces one - without the question the
 * campaign would sit in progress forever over a job the user was never told about.
 *
 * Scope is deliberately the crash path only. An agent-reported `failed` outcome is left alone:
 * the agent was alive to report it and knows whether it got as far as submitting.
 */
export async function recoverApplyingJobs(
  db: RecoveryWriter,
  userId: string,
  where: Prisma.JobWhereInput,
): Promise<{ reapproved: number; parked: number }> {
  // Read before write: updateMany cannot tell us which rows it touched, and each parked job needs
  // its own question. Sequential throughout - callers pass an interactive transaction client, and
  // Prisma does not support concurrent queries on one.
  const stamped = await db.job.findMany({
    where: { ...where, submitAttemptedAt: { not: null } },
    select: { campaignId: true, key: true, title: true, company: true },
  });

  const reapproved = await db.job.updateMany({
    where: { ...where, submitAttemptedAt: null },
    data: { status: "approved" },
  });

  if (stamped.length === 0) {
    return { reapproved: reapproved.count, parked: 0 };
  }

  const parked = await db.job.updateMany({
    where: { ...where, submitAttemptedAt: { not: null } },
    data: { status: "needs_user", skipReason: MAYBE_SUBMITTED_REASON },
  });

  for (const job of stamped) {
    await db.pilotQuestion.create({
      data: {
        userId,
        kind: "choice",
        subjectType: "job",
        // The `campaignId:jobKey` form the agenda's job questions already use.
        subjectId: `${job.campaignId}:${job.key}`,
        prompt: `Did your application to ${job.company} for "${job.title}" go through? It was interrupted mid-submit, so re-applying might send a second one.`,
        options: [...ANSWERS],
      },
    });
  }

  return { reapproved: reapproved.count, parked: parked.count };
}
