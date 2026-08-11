import type { Prisma } from "@/generated/prisma/client";

export type RecoveryWriter = Pick<Prisma.TransactionClient, "job" | "pilotQuestion">;

/** The agent reached the submit and we know it. */
export const MAYBE_SUBMITTED_REASON =
  "Recovered mid-apply after the form may already have been submitted. Check the employer's site or your email before retrying - re-applying would send a second application.";

/** The apply was interrupted and nothing recorded how far it got. */
export const INTERRUPTED_REASON =
  "The apply was interrupted and there is no record of how far it got, so it may or may not have been submitted. Check before retrying.";

/** Answering either way resolves the job; leaving it unanswered lets the sweep skip it, which is safe. */
const ANSWERS = ["It was submitted - mark applied", "It was not submitted - try again"] as const;

/**
 * Hands every interrupted `applying` job to a human rather than retrying it.
 *
 * The original design leaned on `submitAttemptedAt`: stamped meant "may have been sent, ask a
 * human", unstamped meant "safe to retry". In practice the agent does not reliably make that call -
 * across four real applications after the instruction shipped, it marked none - so "unstamped"
 * silently came to mean "no information" rather than "nothing was sent", and auto-retrying it
 * risked exactly the duplicate the stamp existed to prevent.
 *
 * So the default is inverted: interrupted means ask, and the stamp now only sharpens the wording.
 * The asymmetry justifies it - a duplicate application reaches a real employer and cannot be
 * undone, while a needless question costs one glance - and the volume is small: 13 of 352 apply
 * claims have ever reached this path, because only an expired or abandoned claim does. `done` and
 * `failed` are agent-reported and never come through here.
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
): Promise<{ parkedKnownSubmit: number; parkedUnknown: number }> {
  // Read before write: updateMany cannot say which rows it touched, and each parked job needs its
  // own question. Sequential throughout - callers pass an interactive transaction client, and
  // Prisma does not support concurrent queries on one.
  const interrupted = await db.job.findMany({
    where,
    select: {
      campaignId: true,
      key: true,
      title: true,
      company: true,
      submitAttemptedAt: true,
    },
  });
  if (interrupted.length === 0) {
    return { parkedKnownSubmit: 0, parkedUnknown: 0 };
  }

  const known = await db.job.updateMany({
    where: { ...where, submitAttemptedAt: { not: null } },
    data: { status: "needs_user", skipReason: MAYBE_SUBMITTED_REASON },
  });
  const unknown = await db.job.updateMany({
    where: { ...where, submitAttemptedAt: null },
    data: { status: "needs_user", skipReason: INTERRUPTED_REASON },
  });

  for (const job of interrupted) {
    const certain = job.submitAttemptedAt !== null;
    await db.pilotQuestion.create({
      data: {
        userId,
        kind: "choice",
        subjectType: "job",
        // The `campaignId:jobKey` form the agenda's job questions already use.
        subjectId: `${job.campaignId}:${job.key}`,
        prompt: certain
          ? `Did your application to ${job.company} for "${job.title}" go through? It was interrupted mid-submit, so re-applying might send a second one.`
          : `The application to ${job.company} for "${job.title}" was interrupted and never finished recording. Did it go through? Re-applying blind might send a second one.`,
        options: [...ANSWERS],
      },
    });
  }

  return { parkedKnownSubmit: known.count, parkedUnknown: unknown.count };
}
