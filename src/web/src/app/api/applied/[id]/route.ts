import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { type ApiRouteContext, parsePathParams } from "@/lib/api/request";
import { db } from "@/lib/db";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const appId = Number(id);

  if (!Number.isInteger(appId)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid id", 400);
  }

  const profileId = await getActiveProfileId();
  const application = await db.application.findFirst({
    where: { id: appId, profileId },
    include: {
      stageEvents: { orderBy: { occurredAt: "asc" } },
    },
  });
  if (!application) {
    return err(ErrorCodes.NOT_FOUND, "Application not found", 404);
  }
  return ok(application);
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const appId = Number(id);
  if (!Number.isInteger(appId)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid id", 400);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.application.findFirst({
    where: { id: appId, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Application not found", 404);
  }

  await db.application.delete({ where: { id: appId } });
  return ok({ deleted: appId });
}
