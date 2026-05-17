import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const application = await db.application.findFirst({
    where: { id, profileId },
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
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const existing = await db.application.findFirst({
    where: { id, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Application not found", 404);
  }

  await db.application.delete({ where: { id } });
  return ok({ deleted: id });
}
