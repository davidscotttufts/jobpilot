import { conflict } from "@/common/errors";
import type { Prisma } from "@/generated/prisma/client";
import { parseInstructionsConfig } from "../pilot.instructions";

export type ApplyBudgetReader = Pick<
  Prisma.TransactionClient,
  "application" | "job" | "pilotState"
>;

/** Bounds the in-flight scan; see MAX_OPEN_APPLY_CLAIMS for the matching worker ceiling. */
const MAX_IN_FLIGHT = 100;

function startOfDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Refuses an apply claim once the daily cap is committed, counting applies already open.
 *
 * The cap is otherwise only applied when the agenda is built (`if (!capReached) push(...)`), and
 * `job.apply` has no grant gate, so nothing rechecks it at claim time. Serially that is invisible:
 * the agenda rebuilds between applies with a fresh count. Run N workers off one snapshot and they
 * each claim against the same stale `appliedToday`, overshooting by up to N-1.
 *
 * Counting `applying` rows as well as `Application` rows is what makes it hold: an application is
 * only recorded when its result is written, minutes after the claim, so a count of rows alone lets
 * every concurrent worker see the same number.
 */
export async function assertApplyBudget(
  db: ApplyBudgetReader,
  userId: string,
  now: Date,
): Promise<void> {
  const state = await db.pilotState.findUnique({
    where: { userId },
    select: { instructionsConfig: true },
  });
  const { dailyApplyCap, maxConcurrentApplies } = parseInstructionsConfig(
    state?.instructionsConfig ?? {},
  );

  const [appliedToday, inFlight] = await Promise.all([
    db.application.count({ where: { userId, appliedAt: { gte: startOfDay(now) } } }),
    db.job.count({
      where: { status: "applying", campaign: { userId } },
      take: MAX_IN_FLIGHT,
    } as Prisma.JobCountArgs),
  ]);

  if (inFlight >= maxConcurrentApplies) {
    throw conflict(
      `Already applying to ${inFlight} job(s), the configured limit. Finish one before claiming another, or raise maxConcurrentApplies.`,
    );
  }

  const committed = appliedToday + inFlight;
  if (committed >= dailyApplyCap) {
    throw conflict(
      `Daily apply cap reached: ${appliedToday} applied and ${inFlight} in flight against a cap of ${dailyApplyCap}. Stop claiming applies until the cap resets.`,
    );
  }
}
