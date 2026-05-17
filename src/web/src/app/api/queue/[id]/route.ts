import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { type ApiRouteContext, parsePathParams } from "@/lib/api/request";
import { db } from "@/lib/db";
import { patchQueueSchema } from "@/lib/schemas/queue";

type Params = ApiRouteContext<{ id: string }>;

export async function PATCH(req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const entryId = Number(id);

  if (!Number.isInteger(entryId)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid id", 400);
  }

  const body = await req.json();
  const parsed = patchQueueSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid patch", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.queueEntry.findFirst({
    where: { id: entryId, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Queue entry not found", 404);
  }

  const item = await db.queueEntry.update({
    where: { id: entryId },
    data: {
      status: parsed.data.status,
      consumedAt: parsed.data.status === "consumed" ? new Date() : null,
    },
  });
  return ok(item);
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const entryId = Number(id);
  if (!Number.isInteger(entryId)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid id", 400);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.queueEntry.findFirst({
    where: { id: entryId, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Queue entry not found", 404);
  }

  await db.queueEntry.delete({ where: { id: entryId } });
  return ok({ deleted: entryId });
}
