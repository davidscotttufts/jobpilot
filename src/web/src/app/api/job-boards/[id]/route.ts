import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { jobBoardPatchSchema } from "@/lib/schemas/job-board";

type Params = ApiRouteContext<{ id: string }>;

export async function PATCH(req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const body = await req.json();
  const parsed = jobBoardPatchSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid patch", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.jobBoard.findFirst({
    where: { id, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Board not found", 404);
  }

  const board = await db.jobBoard.update({
    where: { id },
    data: parsed.data,
  });
  return ok(board);
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const existing = await db.jobBoard.findFirst({
    where: { id, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Board not found", 404);
  }

  await db.jobBoard.delete({ where: { id } });
  return ok({ deleted: id });
}
