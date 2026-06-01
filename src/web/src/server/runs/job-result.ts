import { db } from "@/server/db";
import { recomputeRunSummary } from "@/server/runs/summary";
import type { runJobResultSchema } from "@/lib/contracts/run";
import { normalizeCompanyName, normalizeJobTitle } from "@/server/scoring/applied-duplicates";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";
import { findOwned } from "@/server/api/owned";
import type { z } from "zod/v4";

interface RecordJobResultInput {
  runId: string;
  key: string;
  profileId: number;
  data: z.infer<typeof runJobResultSchema>;
}

/**
 * Terminal-outcome handoff for a Job. Atomically updates Job status,
 * upserts the Application row (when `applied`), marks the QueueEntry
 * consumed/skipped, and recomputes Run.summary from the post-update
 * Job aggregates. Replaces the apply/auto-apply skills' multi-curl
 * dance with a single POST.
 */
export async function recordJobResult({ runId, key, profileId, data }: RecordJobResultInput) {
  const existing = await findOwned(
    (where) =>
      db.job.findFirst({ where, include: { run: { select: { source: true, summary: true } } } }),
    { runId, key, run: { profileId } },
    "Run job",
  );

  const appliedAt = data.outcome === "applied" ? new Date(data.appliedAt as string) : null;

  const result = await db.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { runId_key: { runId, key } },
      data: {
        status: data.outcome,
        appliedAt: data.outcome === "applied" ? appliedAt : null,
        failReason: data.outcome === "failed" ? data.failReason : null,
        skipReason: data.outcome === "skipped" ? data.skipReason : null,
        retryNotes: data.retryNotes,
        matchScore: data.matchScore,
      },
    });

    let application = null;
    let applicationCreated = false;

    if (data.outcome === "applied") {
      const found = await tx.application.findUnique({
        where: { profileId_url: { profileId, url: job.url } },
      });

      if (found) {
        application = found;
      } else {
        application = await tx.application.create({
          data: {
            profileId,
            url: job.url,
            title: job.title,
            company: job.company,
            location: job.location,
            board: job.board,
            source: existing.run.source as string,
            runId,
            matchScore: job.matchScore,
            matchReason: job.matchReason,
            normalizedTitle: normalizeJobTitle(job.title),
            normalizedCompany: normalizeCompanyName(job.company),
            appliedAt: appliedAt!,
            stageEvents: { create: { fromStage: null, toStage: "applied" } },
          },
        });
        applicationCreated = true;
      }
    }

    const queueStatus = data.outcome === "skipped" ? "skipped" : "consumed";
    await tx.queueEntry.updateMany({
      where: { profileId, url: job.url, status: "pending" },
      data: {
        status: queueStatus,
        consumedAt: queueStatus === "consumed" ? new Date() : null,
      },
    });

    const summary = await recomputeRunSummary(tx, runId);

    return { job, application, applicationCreated, summary };
  });

  publish(runChannel, { runId }, { type: "job-update", payload: { kind: "updated", job: result.job } });
  publish(runChannel, { runId }, { type: "progress", payload: result.summary });
  publish(pipelineChannel, { profileId }, { type: "runjob.updated", runId, key, status: data.outcome });
  if (result.applicationCreated) {
    publish(pipelineChannel, { profileId }, { type: "application.created", runId });
  }

  return {
    runJob: result.job,
    application: result.application,
    summary: result.summary,
  };
}
