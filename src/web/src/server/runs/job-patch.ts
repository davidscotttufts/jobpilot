import { db } from "@/server/db";
import { recomputeRunSummary } from "@/server/runs/summary";
import type { patchRunJobSchema } from "@/lib/contracts/run";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";
import { findOwned } from "@/server/api/owned";
import type { z } from "zod/v4";

interface PatchRunJobInput {
  runId: string;
  key: string;
  profileId: number;
  patch: z.infer<typeof patchRunJobSchema>;
}

export async function patchRunJob({ runId, key, profileId, patch }: PatchRunJobInput) {
  await findOwned(
    (where) => db.job.findFirst({ where, select: { runId: true } }),
    { runId, key, run: { profileId } },
    "Run job",
  );

  const job = await db.job.update({
    where: { runId_key: { runId, key } },
    data: {
      status: patch.status,
      appliedAt: patch.appliedAt ? new Date(patch.appliedAt) : null,
      failReason: patch.failReason,
      retryNotes: patch.retryNotes,
      skipReason: patch.skipReason,
      matchScore: patch.matchScore,
      matchReason: patch.matchReason,
      description: patch.description,
      digest: patch.digest,
    },
  });

  if (job.status === "applied" || job.status === "failed" || job.status === "skipped") {
    const queueStatus = job.status === "skipped" ? "skipped" : "consumed";
    await db.queueEntry.updateMany({
      where: { profileId, url: job.url, status: "pending" },
      data: {
        status: queueStatus,
        consumedAt: queueStatus === "consumed" ? new Date() : null,
      },
    });
  }

  publish(runChannel, { runId }, { type: "job-update", payload: { kind: "updated", job } });

  if (patch.status) {
    const summary = await recomputeRunSummary(db, runId);
    publish(runChannel, { runId }, { type: "progress", payload: summary });
  }

  publish(
    pipelineChannel,
    { profileId },
    { type: "runjob.updated", runId, key, status: patch.status },
  );

  return job;
}
