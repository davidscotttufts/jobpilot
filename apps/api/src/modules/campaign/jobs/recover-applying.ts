import type { Prisma } from "@/generated/prisma/client";

export type RecoveryWriter = Pick<Prisma.TransactionClient, "job">;

/** Shown on a job parked for review; the agent must not re-apply on its own. */
export const MAYBE_SUBMITTED_REASON =
  "Recovered mid-apply after the form may already have been submitted. Check the employer's site or your email before retrying - re-applying would send a second application.";

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
 * Scope is deliberately the crash path only. An agent-reported `failed` outcome is left alone:
 * the agent was alive to report it and knows whether it got as far as submitting.
 */
export async function recoverApplyingJobs(
  db: RecoveryWriter,
  where: Prisma.JobWhereInput,
): Promise<{ reapproved: number; parked: number }> {
  const [reapproved, parked] = await Promise.all([
    db.job.updateMany({
      where: { ...where, submitAttemptedAt: null },
      data: { status: "approved" },
    }),
    db.job.updateMany({
      where: { ...where, submitAttemptedAt: { not: null } },
      data: { status: "needs_user", skipReason: MAYBE_SUBMITTED_REASON },
    }),
  ]);

  return { reapproved: reapproved.count, parked: parked.count };
}
