import { z } from "zod/v4";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { reconcileStaleRuns } from "@/server/runs/reconcile";
import { summarizeJobs } from "@/server/runs/summary";
import { updateRunSchema } from "@/lib/contracts/run";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";
import { cleanReplacementCharsNullable } from "@/utils/text";

const runParams = z.object({ id: z.string() });

export const GET = api.profileRoute({ params: runParams }, async ({ params, profileId }) => {
  const { id } = params;
  await reconcileStaleRuns(profileId);

  const run = await findOwned(
    (where) => db.run.findFirst({ where, include: { jobs: { orderBy: { id: "asc" } } } }),
    { runId: id, profileId },
    "Run",
  );

  return {
    ...run,
    // Clean replacement-char artifacts in historical rows written before the
    // schema-level sanitizer landed, so the UI never shows mojibake.
    jobs: run.jobs.map((job) => ({
      ...job,
      skipReason: cleanReplacementCharsNullable(job.skipReason),
      failReason: cleanReplacementCharsNullable(job.failReason),
      matchReason: cleanReplacementCharsNullable(job.matchReason),
      retryNotes: cleanReplacementCharsNullable(job.retryNotes),
    })),
    config: JSON.parse(run.config) as Record<string, unknown>,
    // Job-based runs derive the summary from their loaded jobs so the tiles
    // always match the rows; outreach campaigns have no jobs, so their
    // recomputed `Run.summary` (OutreachMessage aggregates) is authoritative.
    summary:
      run.source === "outreach"
        ? (JSON.parse(run.summary) as Record<string, unknown>)
        : summarizeJobs(run.jobs),
  };
});

export const PATCH = api.profileRoute(
  { params: runParams, body: updateRunSchema },
  async ({ params, body, profileId }) => {
    const { id } = params;
    const existing = await findOwned(
      (where) => db.run.findFirst({ where }),
      { runId: id, profileId },
      "Run",
    );

    const update: Prisma.RunUpdateInput = { status: body.status };

    if (body.summary) {
      update.summary = JSON.stringify({ ...JSON.parse(existing.summary), ...body.summary });
    }
    if (body.config) {
      update.config = JSON.stringify({ ...JSON.parse(existing.config), ...body.config });
    }
    if (body.completedAt !== undefined) {
      update.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    }

    const run = await db.run.update({ where: { runId: id }, data: update });

    if (body.status) {
      publish(
        runChannel,
        { runId: id },
        {
          type: "status",
          payload: { status: body.status },
        },
      );
      publish(
        pipelineChannel,
        { profileId },
        body.status === "completed"
          ? { type: "run.completed", runId: id }
          : {
              type: "run.updated",
              runId: id,
              status: body.status,
              source: existing.source,
            },
      );
    }
    if (body.summary) {
      publish(runChannel, { runId: id }, { type: "progress", payload: JSON.parse(run.summary) });
    }

    return {
      ...run,
      config: JSON.parse(run.config) as Record<string, unknown>,
      summary: JSON.parse(run.summary) as Record<string, unknown>,
    };
  },
);
