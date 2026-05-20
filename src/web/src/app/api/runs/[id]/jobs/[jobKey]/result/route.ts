import { getActiveProfileId } from "@/lib/active-profile";
import { parsePathParams, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { runJobResultSchema, type RunSummary } from "@/lib/schemas/run";
import { normalizeCompanyName, normalizeJobTitle } from "@/lib/scoring/applied-duplicates";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";

type Params = ApiRouteContext<{ id: string; jobKey: string }>;

const EMPTY_SUMMARY: RunSummary = {
  totalFound: 0,
  qualified: 0,
  applied: 0,
  failed: 0,
  skipped: 0,
  remaining: 0,
};

/**
 * Terminal-outcome handoff for a RunJob. Atomically updates RunJob status,
 * upserts the Application row (when `applied`), marks the QueueEntry
 * consumed/skipped, and recomputes Run.summary from the post-update
 * RunJob aggregates. Replaces the apply/auto-apply skills' multi-curl
 * dance with a single POST.
 */
export async function POST(req: Request, ctx: Params) {
  const { id: runId, jobKey } = await parsePathParams(ctx);
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
  const existing = await db.runJob.findFirst({
    where: { runId, jobKey, run: { profileId } },
    include: { run: { select: { source: true, summary: true } } },
  });

  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Run job not found", 404);
  }

  const data = parsed.data;
  const appliedAt = data.outcome === "applied" ? new Date(data.appliedAt as string) : null;

  const result = await db.$transaction(async (tx) => {
    const job = await tx.runJob.update({
      where: { runId_jobKey: { runId, jobKey } },
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

    const counts = await tx.runJob.groupBy({
      by: ["status"],
      where: { runId },
      _count: { _all: true },
    });

    const summary: RunSummary = { ...EMPTY_SUMMARY };
    let qualified = 0;
    let remaining = 0;

    for (const row of counts) {
      const n = row._count._all;
      summary.totalFound += n;

      if (row.status !== "skipped") {
        qualified += n;
      }
      if (row.status === "applied") {
        summary.applied = n;
      } else if (row.status === "failed") {
        summary.failed = n;
      } else if (row.status === "skipped") {
        summary.skipped = n;
      } else if (row.status === "approved" || row.status === "applying") {
        remaining += n;
      }
    }

    summary.qualified = qualified;
    summary.remaining = remaining;

    await tx.run.update({
      where: { runId },
      data: { summary: JSON.stringify(summary) },
    });

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
      jobKey,
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
