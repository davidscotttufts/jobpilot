import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { RunJobStatus, RunSummary } from "@/lib/contracts/run";

function emptySummary(): RunSummary {
  return {
    totalFound: 0,
    qualified: 0,
    applied: 0,
    failed: 0,
    skipped: 0,
    remaining: 0,
    discovered: 0,
    drafted: 0,
    sent: 0,
    replied: 0,
    bounced: 0,
  };
}

function fold(summary: RunSummary, status: RunJobStatus, n: number): void {
  summary.totalFound += n;

  if (status !== "skipped") {
    summary.qualified += n;
  }
  if (status === "applied") {
    summary.applied += n;
  } else if (status === "failed") {
    summary.failed += n;
  } else if (status === "skipped") {
    summary.skipped += n;
  } else if (status === "approved" || status === "applying") {
    summary.remaining += n;
  }
}

/** Derive a {@link RunSummary} from already-loaded job rows. Pure; no I/O. */
export function summarizeJobs(jobs: { status: string }[]): RunSummary {
  const summary = emptySummary();
  for (const job of jobs) {
    fold(summary, job.status as RunJobStatus, 1);
  }
  return summary;
}

/**
 * Recompute a run's {@link RunSummary} from its current Job-status aggregates
 * and persist it to `Run.summary`. Call after any mutation that changes a job's
 * status (terminal outcomes, rescan promotions) so the run tiles stay in sync.
 * Accepts a transaction client or the bare `db`.
 */
export async function recomputeRunSummary(
  client: Prisma.TransactionClient,
  runId: string,
): Promise<RunSummary> {
  const counts = await client.job.groupBy({
    by: ["status"],
    where: { runId },
    _count: { _all: true },
  });

  const summary = emptySummary();
  for (const row of counts) {
    fold(summary, row.status as RunJobStatus, row._count._all);
  }

  await client.run.update({
    where: { runId },
    data: { summary: JSON.stringify(summary) },
  });

  return summary;
}

/**
 * Recompute summary for an outreach campaign (`Run.source === "outreach"`) from
 * its OutreachMessage-status aggregates and persist it. `discovered` counts the
 * distinct contacts reached on the run; the remaining fields fold message
 * statuses. Mirrors {@link recomputeRunSummary} for the outreach board.
 */
export async function recomputeOutreachSummary(
  client: Prisma.TransactionClient,
  runId: string,
): Promise<RunSummary> {
  const [counts, contacts] = await Promise.all([
    client.outreachMessage.groupBy({
      by: ["status"],
      where: { runId },
      _count: { _all: true },
    }),
    client.outreachMessage.findMany({
      where: { runId },
      select: { contactId: true },
      distinct: ["contactId"],
    }),
  ]);

  const summary = emptySummary();
  summary.discovered = contacts.length;
  for (const row of counts) {
    const n = row._count._all;
    summary.totalFound += n;
    switch (row.status) {
      case "draft":
      case "approved":
        summary.drafted += n;
        break;
      case "sent":
        summary.sent += n;
        break;
      case "replied":
        summary.replied += n;
        break;
      case "bounced":
        summary.bounced += n;
        break;
    }
  }

  await client.run.update({
    where: { runId },
    data: { summary: JSON.stringify(summary) },
  });

  return summary;
}
