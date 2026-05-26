import type { Prisma } from "@/generated/prisma/client";
import { getActiveProfileId } from "@/lib/active-profile";
import { parsePathParams, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { reconcileStaleRuns } from "@/lib/runs/reconcile";
import { updateRunSchema } from "@/lib/schemas/run";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";
import { cleanReplacementCharsNullable } from "@/utils/text";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);

  const profileId = await getActiveProfileId();
  await reconcileStaleRuns(profileId);

  const run = await db.run.findFirst({
    where: { runId: id, profileId },
    include: { jobs: { orderBy: { id: "asc" } } },
  });

  if (!run) {
    return err(ErrorCodes.NOT_FOUND, "Run not found", 404);
  }

  return ok({
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
    summary: JSON.parse(run.summary) as Record<string, unknown>,
  });
}

export async function PATCH(req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const body = await req.json();
  const parsed = updateRunSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid run patch", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.run.findFirst({ where: { runId: id, profileId } });

  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Run not found", 404);
  }

  const data = parsed.data;
  const update: Prisma.RunUpdateInput = { status: data.status };

  if (data.summary) {
    update.summary = JSON.stringify({ ...JSON.parse(existing.summary), ...data.summary });
  }
  if (data.config) {
    update.config = JSON.stringify({ ...JSON.parse(existing.config), ...data.config });
  }
  if (data.completedAt !== undefined) {
    update.completedAt = data.completedAt ? new Date(data.completedAt) : null;
  }

  const run = await db.run.update({ where: { runId: id }, data: update });

  if (parsed.data.status) {
    publish(
      runChannel,
      { runId: id },
      {
        type: "status",
        payload: { status: parsed.data.status },
      },
    );
    publish(
      pipelineChannel,
      { profileId },
      parsed.data.status === "completed"
        ? { type: "run.completed", runId: id }
        : {
            type: "run.updated",
            runId: id,
            status: parsed.data.status,
            source: existing.source,
          },
    );
  }
  if (data.summary) {
    publish(runChannel, { runId: id }, { type: "progress", payload: JSON.parse(run.summary) });
  }

  return ok({
    ...run,
    config: JSON.parse(run.config) as Record<string, unknown>,
    summary: JSON.parse(run.summary) as Record<string, unknown>,
  });
}
