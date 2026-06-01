import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { patchContactSchema } from "@/lib/schemas/outreach";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const contact = await db.contact.findFirst({
    where: { id, profileId },
    include: { messages: { orderBy: { id: "asc" } } },
  });

  if (!contact) {
    return err(ErrorCodes.NOT_FOUND, "Contact not found", 404);
  }
  return ok(contact);
}

export async function PATCH(req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const body = await req.json();
  const parsed = patchContactSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid contact payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.contact.findFirst({ where: { id, profileId }, select: { id: true } });

  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Contact not found", 404);
  }

  const contact = await db.contact.update({ where: { id }, data: parsed.data });
  return ok(contact);
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const deleted = await db.contact.deleteMany({ where: { id, profileId } });

  if (deleted.count === 0) {
    return err(ErrorCodes.NOT_FOUND, "Contact not found", 404);
  }
  return ok({ deleted: true });
}
