import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { type ApiRouteContext, parsePathParams } from "@/lib/api/request";
import { db } from "@/lib/db";
import { jobBoardPatchSchema } from "@/lib/schemas/job-board";

type Params = ApiRouteContext<{ id: string }>;

export async function PATCH(req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const boardId = Number(id);

  if (!Number.isInteger(boardId)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid id", 400);
  }

  const body = await req.json();
  const parsed = jobBoardPatchSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid patch", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.jobBoard.findFirst({
    where: { id: boardId, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Board not found", 404);
  }

  const board = await db.jobBoard.update({
    where: { id: boardId },
    data: parsed.data,
  });
  return ok(board);
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const boardId = Number(id);
  if (!Number.isInteger(boardId)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid id", 400);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.jobBoard.findFirst({
    where: { id: boardId, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Board not found", 404);
  }

  await db.jobBoard.delete({ where: { id: boardId } });
  return ok({ deleted: boardId });
}
