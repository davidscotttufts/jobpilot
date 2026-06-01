import "server-only";
import { db } from "@/server/db";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Flip `in_progress` runs whose `updatedAt` is older than
 * {@link STALE_THRESHOLD_MS} to `interrupted`, and revert their `applying` jobs
 * to `approved` so `/resume <runId>` can pick them up. Emits SSE per run.
 * Called from runs GET handlers; no background timer.
 */
export async function reconcileStaleRuns(profileId: number): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

  const stale = await db.run.findMany({
    where: {
      profileId,
      status: "in_progress",
      updatedAt: { lt: cutoff },
    },
    select: { runId: true, source: true },
  });

  if (stale.length === 0) {
    return 0;
  }

  await db.$transaction([
    db.run.updateMany({
      where: { runId: { in: stale.map((r) => r.runId) } },
      data: { status: "interrupted" },
    }),
    db.job.updateMany({
      where: { runId: { in: stale.map((r) => r.runId) }, status: "applying" },
      data: { status: "approved" },
    }),
  ]);

  for (const r of stale) {
    publish(runChannel, { runId: r.runId }, { type: "status", payload: { status: "interrupted" } });
    publish(
      pipelineChannel,
      { profileId },
      { type: "run.updated", runId: r.runId, status: "interrupted", source: r.source },
    );
  }

  return stale.length;
}
