import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { type ApiRouteContext, parsePathParams } from "@/lib/api/request";
import { db } from "@/lib/db";
import { updateRunSchema } from "@/lib/schemas/run";
import { publishPipelineEventFromRun, publishRunEvent } from "@/lib/sse";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const profileId = await getActiveProfileId();
  const run = await db.run.findFirst({
    where: { runId: id, profileId },
    include: { jobs: { orderBy: { id: "asc" } } },
  });
  if (!run) return err(ErrorCodes.NOT_FOUND, "Run not found", 404);
  return ok({
    ...run,
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

  const summaryNext = parsed.data.summary
    ? {
        ...(JSON.parse(existing.summary) as Record<string, unknown>),
        ...parsed.data.summary,
      }
    : undefined;

  const run = await db.run.update({
    where: { runId: id },
    data: {
      status: parsed.data.status,
      completedAt:
        parsed.data.completedAt === undefined
          ? undefined
          : parsed.data.completedAt
            ? new Date(parsed.data.completedAt)
            : null,
      summary: summaryNext === undefined ? undefined : JSON.stringify(summaryNext),
    },
  });

  if (parsed.data.status) {
    publishRunEvent(id, { type: "status", payload: { status: parsed.data.status } });
    const pipelineType = parsed.data.status === "completed" ? "run.completed" : "run.updated";
    await publishPipelineEventFromRun(id, {
      type: pipelineType,
      runId: id,
      status: parsed.data.status,
      source: existing.source,
    });
  }
  if (summaryNext) {
    publishRunEvent(id, { type: "progress", payload: summaryNext });
  }

  return ok({
    ...run,
    config: JSON.parse(run.config) as Record<string, unknown>,
    summary: JSON.parse(run.summary) as Record<string, unknown>,
  });
}
