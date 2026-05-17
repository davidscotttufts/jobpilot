import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { type ApiRouteContext, parsePathParams } from "@/lib/api/request";
import { db } from "@/lib/db";
import { credentialPatchSchema } from "@/lib/schemas/credential";

type Params = ApiRouteContext<{ id: string }>;

export async function PATCH(req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const credId = Number(id);

  if (!Number.isInteger(credId)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid id", 400);
  }

  const body = await req.json();
  const parsed = credentialPatchSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid patch", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.credential.findFirst({
    where: { id: credId, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Credential not found", 404);
  }

  const cred = await db.credential.update({ where: { id: credId }, data: parsed.data });
  return ok(cred);
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id } = await parsePathParams(ctx);
  const credId = Number(id);
  if (!Number.isInteger(credId)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid id", 400);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.credential.findFirst({
    where: { id: credId, profileId },
    select: { id: true },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Credential not found", 404);
  }

  await db.credential.delete({ where: { id: credId } });
  return ok({ deleted: credId });
}
