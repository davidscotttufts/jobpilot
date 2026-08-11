import {
  INTERRUPTED_REASON,
  MAYBE_SUBMITTED_REASON,
  RECOVERY_ANSWERS,
} from "@jobpilot/contracts/campaign";
import type { PilotQuestion, Prisma } from "@/generated/prisma/client";

export type RecoveryWriter = Pick<Prisma.TransactionClient, "job" | "pilotQuestion">;

/**
 * Rows parked per pass. Callers pass an interactive transaction, whose default budget is 5s, and
 * each parked job costs a question write - so this bounds the transaction rather than the backlog.
 * Parking takes a job out of `applying`, so a larger pile simply drains over consecutive passes.
 */
const RECOVERY_BATCH = 25;

/**
 * How long the user has to answer before the job is skipped. Long, because the honest answer often
 * means checking an inbox: the expiry sweep then skips the job, which loses a posting but can never
 * send a second application.
 */
const RECOVERY_QUESTION_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export interface RecoveryOutcome {
  parkedKnownSubmit: number;
  parkedUnknown: number;
  /**
   * Questions created here. The caller publishes them after its transaction commits - the web's
   * open-question list and its push both hang off `question.created`, so a question written
   * straight to Prisma would sit invisible until a manual reload.
   */
  questions: PilotQuestion[];
}

/** A factory, not a shared constant: callers own the returned array and one would alias the other. */
const nothing = (): RecoveryOutcome => ({
  parkedKnownSubmit: 0,
  parkedUnknown: 0,
  questions: [],
});

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
 * undone, while a needless question costs one glance.
 *
 * Parking also raises a question, and that question is the only exit. `needs_user` is an active
 * status, so a parked job keeps its campaign from finalizing; the question carries an expiry so an
 * ignored one resolves to a skip instead of wedging the campaign forever.
 *
 * Scope is deliberately the crash path only. An agent-reported `failed` outcome is left alone:
 * the agent was alive to report it and knows whether it got as far as submitting.
 */
export async function recoverApplyingJobs(
  db: RecoveryWriter,
  userId: string,
  where: Prisma.JobWhereInput,
): Promise<RecoveryOutcome> {
  // Read before write: updateMany cannot say which rows it touched, and each parked job needs its
  // own question. Sequential throughout - callers pass an interactive transaction client, and
  // Prisma does not support concurrent queries on one.
  const interrupted = await db.job.findMany({
    where,
    take: RECOVERY_BATCH,
    select: { campaignId: true, key: true, submitAttemptedAt: true },
  });
  if (interrupted.length === 0) return nothing();

  // Scope both writes to the rows just read, rather than re-deriving them from `where`. Reading a
  // capped page and writing an uncapped predicate would park jobs this pass never saw, and a parked
  // job with no question is exactly the campaign-wedging state parking exists to avoid.
  // `AND` rather than a spread: the callers' `where` already carries its own `OR`/`NOT` ref lists.
  const refsOf = (rows: typeof interrupted) =>
    rows.map((job) => ({ campaignId: job.campaignId, key: job.key }));
  const stamped = interrupted.filter((job) => job.submitAttemptedAt !== null);
  const unstamped = interrupted.filter((job) => job.submitAttemptedAt === null);

  const known = stamped.length
    ? await db.job.updateMany({
        where: { AND: [where, { OR: refsOf(stamped) }] },
        data: { status: "needs_user", skipReason: MAYBE_SUBMITTED_REASON },
      })
    : { count: 0 };
  const unknown = unstamped.length
    ? await db.job.updateMany({
        where: { AND: [where, { OR: refsOf(unstamped) }] },
        data: { status: "needs_user", skipReason: INTERRUPTED_REASON },
      })
    : { count: 0 };

  // Ask about what was actually parked, not what was read. A row that reached `applied` between the
  // two would otherwise get an unanswerable "did it go through?" against a recorded application.
  const parked = await db.job.findMany({
    where: { campaign: { userId }, status: "needs_user", OR: refsOf(interrupted) },
    select: { campaignId: true, key: true, title: true, company: true, submitAttemptedAt: true },
  });
  if (parked.length === 0) {
    return { parkedKnownSubmit: known.count, parkedUnknown: unknown.count, questions: [] };
  }

  // The `campaignId:jobKey` form the agenda's job questions already use.
  const subjectId = (job: { campaignId: string; key: string }) => `${job.campaignId}:${job.key}`;
  // A job parked, re-applied, then crashed again must not accumulate a second permanent question.
  const open = await db.pilotQuestion.findMany({
    where: {
      userId,
      status: "open",
      subjectType: "job",
      subjectId: { in: parked.map(subjectId) },
    },
    select: { subjectId: true },
  });
  const asked = new Set(open.map((question) => question.subjectId));

  const expiresAt = new Date(Date.now() + RECOVERY_QUESTION_TTL_MS);
  const questions: PilotQuestion[] = [];
  for (const job of parked) {
    if (asked.has(subjectId(job))) continue;
    const certain = job.submitAttemptedAt !== null;
    questions.push(
      await db.pilotQuestion.create({
        data: {
          userId,
          kind: "choice",
          subjectType: "job",
          subjectId: subjectId(job),
          prompt: certain
            ? `Did your application to ${job.company} for "${job.title}" go through? It was interrupted mid-submit, so re-applying might send a second one.`
            : `The application to ${job.company} for "${job.title}" was interrupted and never finished recording. Did it go through? Re-applying blind might send a second one.`,
          options: [...RECOVERY_ANSWERS],
          deepLink: `/campaigns/${job.campaignId}`,
          expiresAt,
        },
      }),
    );
  }

  return { parkedKnownSubmit: known.count, parkedUnknown: unknown.count, questions };
}
