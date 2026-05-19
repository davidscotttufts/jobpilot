import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { type ApiRouteContext, parsePathParams } from "@/lib/api/request";
import { db } from "@/lib/db";
import { patchRunJobSchema } from "@/lib/schemas/run";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";

type Params = ApiRouteContext<{ id: string; jobKey: string }>;

export async function PATCH(req: Request, ctx: Params) {
  const { id, jobKey } = await parsePathParams(ctx);
  const body = await req.json();
  const parsed = patchRunJobSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid run job patch", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.runJob.findFirst({
    where: { runId: id, jobKey, run: { profileId } },
  });

  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Run job not found", 404);
  }

  const job = await db.runJob.update({
    where: { runId_jobKey: { runId: id, jobKey } },
    data: {
      status: parsed.data.status,
      appliedAt: parsed.data.appliedAt ? new Date(parsed.data.appliedAt) : null,
      failReason: parsed.data.failReason,
      retryNotes: parsed.data.retryNotes,
      skipReason: parsed.data.skipReason,
      matchScore: parsed.data.matchScore,
      matchReason: parsed.data.matchReason,
      jobDigest: parsed.data.jobDigest,
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

  publish(runChannel, { runId: id }, {
    type: "job-update",
    payload: { kind: "updated", job },
  });
  publish(pipelineChannel, { profileId }, {
    type: "runjob.updated",
    runId: id,
    jobKey,
    status: parsed.data.status,
  });
  return ok(job);
}
