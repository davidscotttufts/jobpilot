import { getActiveProfileId } from "@/lib/active-profile";
import { parsePathParams, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { runEventSchema } from "@/lib/schemas/run";
import { runChannel, type RunEvent } from "@/lib/sse/channels/run";
import { publish, sseResponse, subscribe } from "@/lib/sse/server";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const profileId = await getActiveProfileId();
  const run = await db.run.findFirst({
    where: { runId: id, profileId },
    select: { runId: true },
  });

  if (!run) {
    return err(ErrorCodes.NOT_FOUND, "Run not found", 404);
  }

  return sseResponse(subscribe(runChannel, { runId: id }));
}

export async function POST(req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const profileId = await getActiveProfileId();
  const run = await db.run.findFirst({
    where: { runId: id, profileId },
    select: { runId: true },
  });
  if (!run) {
    return err(ErrorCodes.NOT_FOUND, "Run not found", 404);
  }

  const body = await req.json();
  const parsed = runEventSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid event payload", 422, parsed.error.issues);
  }

  const event = await db.runEvent.create({
    data: {
      runId: id,
      type: parsed.data.type,
      payload: JSON.stringify(parsed.data.payload),
    },
  });

  publish(runChannel, { runId: id }, {
    type: parsed.data.type,
    payload: parsed.data.payload,
  } as RunEvent);

  return ok({ id: event.id }, { status: 201 });
}
