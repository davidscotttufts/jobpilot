import { pilotChannel } from "@jobpilot/contracts/sse";
import { publish } from "@/common/sse";
import type { Prisma } from "@/generated/prisma/client";
import { toPilotQuestion } from "@/modules/pilot/pilot.mapper";
import { type BoardDrift, detectBoardDrift } from "./board-drift";

export type DriftSweepClient = Pick<Prisma.TransactionClient, "job" | "pilotQuestion">;

/** Run the scan every Nth agenda cycle; the underlying data moves over days. */
export const DRIFT_SWEEP_CYCLES = 12;

/** Enough history per board to judge, without scanning the whole table every cycle. */
const SCAN = 400;

/** Stable per (board, newHost) so a drift is reported once, not every cycle. */
export function driftSubjectId(drift: BoardDrift): string {
  return `${drift.board}->${drift.newHost}`;
}

/**
 * Raises one question when a board starts serving a new host.
 *
 * The question, not an automatic alias: whether two hosts are the same postings is a claim about
 * the world, and getting it wrong either way is costly - alias two distinct boards and real jobs
 * silently vanish into dedupe; miss a real rename and applications go out twice, which is what
 * happened with hiring.cafe.
 */
/** A "same site" answer nobody acted on should resurface rather than be forgotten. */
export const REASK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export async function sweepBoardDrift(
  db: DriftSweepClient,
  userId: string,
  webUrl: string | null,
  now: Date = new Date(),
): Promise<BoardDrift[]> {
  const rows = await db.job.findMany({
    where: { campaign: { userId }, board: { not: null } },
    orderBy: { createdAt: "desc" },
    take: SCAN,
    select: { board: true, url: true, createdAt: true },
  });

  const drifts = detectBoardDrift(rows, now);
  const raised: BoardDrift[] = [];

  for (const drift of drifts) {
    const subjectId = driftSubjectId(drift);
    // Not "asked once ever": "same site" is a request for a human to add an alias, and nothing
    // tracks whether they did. If they never do, duplicates keep going out. So an open question
    // suppresses, and an answered one only suppresses for a cooldown - after which, if the two
    // hosts are still both live, the detector is entitled to ask again.
    const existing = await db.pilotQuestion.findFirst({
      where: {
        userId,
        subjectType: "board",
        subjectId,
        OR: [{ status: "open" }, { createdAt: { gte: new Date(now.getTime() - REASK_AFTER_MS) } }],
      },
      select: { id: true },
    });
    if (existing) {
      continue;
    }

    const created = await db.pilotQuestion.create({
      data: {
        userId,
        kind: "choice",
        subjectType: "board",
        subjectId,
        prompt: `${drift.board} has started serving jobs from ${drift.newHost} instead of ${drift.establishedHost} (${drift.newHostJobs} so far). If they are the same site, applications to the same job under both names will not be recognised as duplicates.`,
        options: ["Same site - treat as one", "Different site - keep separate"],
        deepLink: webUrl ? `${webUrl}/boards` : null,
      },
    });
    // The open-question feed refreshes on SSE only - without this the question exists but the
    // badge and attention list do not move until the user happens to navigate.
    publish(
      pilotChannel,
      { userId },
      { type: "question.created", question: toPilotQuestion(created) },
    );
    raised.push(drift);
  }

  return raised;
}
