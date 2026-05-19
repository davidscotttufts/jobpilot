import { getActiveProfileId } from "@/lib/active-profile";
import { parsePathParams, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { addRunJobSchema } from "@/lib/schemas/run";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const profileId = await getActiveProfileId();
  const jobs = await db.runJob.findMany({
    where: { runId: id, run: { profileId } },
    orderBy: { id: "asc" },
  });
  return ok(jobs);
}

export async function POST(req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const body = await req.json();
  const parsed = addRunJobSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid run job payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.run.findFirst({ where: { runId: id, profileId } });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Run not found", 404);
  }

  try {
    const job = await db.runJob.create({
      data: {
        runId: id,
        jobKey: parsed.data.jobKey,
        title: parsed.data.title,
        company: parsed.data.company,
        location: parsed.data.location ?? null,
        salary: parsed.data.salary ?? null,
        type: parsed.data.type ?? null,
        url: parsed.data.url,
        board: parsed.data.board ?? null,
        matchScore: parsed.data.matchScore ?? null,
        matchReason: parsed.data.matchReason ?? null,
        status: parsed.data.status ?? "pending",
        description: parsed.data.description ?? null,
      },
    });

    await db.queueEntry.updateMany({
      where: { profileId, url: job.url, status: "pending" },
      data: { status: "consumed", consumedAt: new Date() },
    });

    publish(runChannel, { runId: id }, {
      type: "job-update",
      payload: { kind: "added", job },
    });
    publish(pipelineChannel, { profileId }, {
      type: "runjob.created",
      runId: id,
      jobKey: job.jobKey,
    });

    return ok(job, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return err(ErrorCodes.CONFLICT, "Job with this jobKey already exists in run", 409);
    }
    throw e;
  }
}
