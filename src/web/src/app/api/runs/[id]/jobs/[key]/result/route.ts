import { getActiveProfileId } from "@/lib/active-profile";
import { parsePathParams, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { recomputeRunSummary } from "@/lib/runs/summary";
import { runJobResultSchema } from "@/lib/schemas/run";
import { normalizeCompanyName, normalizeJobTitle } from "@/lib/scoring/applied-duplicates";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";

type Params = ApiRouteContext<{ id: string; key: string }>;

/**
 * Terminal-outcome handoff for a Job. Atomically updates Job status,
 * upserts the Application row (when `applied`), marks the QueueEntry
 * consumed/skipped, and recomputes Run.summary from the post-update
 * Job aggregates. Replaces the apply/auto-apply skills' multi-curl
 * dance with a single POST.
 */
export async function POST(req: Request, ctx: Params) {
  const { id: runId, key } = await parsePathParams(ctx);
  const body = await req.json();
  const parsed = runJobResultSchema.safeParse(body);

  if (!parsed.success) {
    return err(
      ErrorCodes.UNPROCESSABLE,
      "Invalid run-job result payload",
      422,
      parsed.error.issues,
    );
  }

  const profileId = await getActiveProfileId();
  const existing = await db.job.findFirst({
    where: { runId, key, run: { profileId } },
    include: { run: { select: { source: true, summary: true } } },
  });

  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Run job not found", 404);
  }

  const data = parsed.data;
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

  publish(
    runChannel,
    { runId },
    {
      type: "job-update",
      payload: { kind: "updated", job: result.job },
    },
  );
  publish(
    runChannel,
    { runId },
    {
      type: "progress",
      payload: result.summary,
    },
  );
  publish(
    pipelineChannel,
    { profileId },
    {
      type: "runjob.updated",
      runId,
      key,
      status: data.outcome,
    },
  );
  if (result.applicationCreated) {
    publish(
      pipelineChannel,
      { profileId },
      {
        type: "application.created",
        runId,
      },
    );
  }

  return ok({
    runJob: result.job,
    application: result.application,
    summary: result.summary,
  });
}
