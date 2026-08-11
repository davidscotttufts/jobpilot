import type { Prisma } from "@/generated/prisma/client";
import { type BoardDrift, detectBoardDrift } from "./board-drift";

export type DriftSweepClient = Pick<Prisma.TransactionClient, "job" | "pilotQuestion">;

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
export async function sweepBoardDrift(
  db: DriftSweepClient,
  userId: string,
  webUrl: string | null,
): Promise<BoardDrift[]> {
  const rows = await db.job.findMany({
    where: { campaign: { userId }, board: { not: null } },
    orderBy: { createdAt: "desc" },
    take: SCAN,
    select: { board: true, url: true, createdAt: true },
  });

  const drifts = detectBoardDrift(rows);
  const raised: BoardDrift[] = [];

  for (const drift of drifts) {
    const subjectId = driftSubjectId(drift);
    const existing = await db.pilotQuestion.findFirst({
      where: { userId, subjectType: "board", subjectId },
      select: { id: true },
    });
    if (existing) {
      continue;
    }

    await db.pilotQuestion.create({
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
    raised.push(drift);
  }

  return raised;
}
