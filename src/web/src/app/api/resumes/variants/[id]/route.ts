import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { resumeVariantPatchSchema } from "@/lib/schemas/resume";
import type { ResumeVariantDto } from "@/types/api";

type Params = ApiRouteContext<{ id: string }>;

async function loadOwned(id: number) {
  const profileId = await getActiveProfileId();
  return db.resumeVariant.findFirst({
    where: { id, resume: { profileId } },
    include: { resume: { select: { label: true } } },
  });
}

export async function GET(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const variant = await loadOwned(id);
  if (!variant) {
    return err(ErrorCodes.NOT_FOUND, "Variant not found", 404);
  }

  const dto: ResumeVariantDto = {
    id: variant.id,
    resumeId: variant.resumeId,
    resumeLabel: variant.resume.label,
    label: variant.label,
    jobUrl: variant.jobUrl,
    applicationId: variant.applicationId,
    content: JSON.parse(variant.content),
    diffNotes: variant.diffNotes,
    createdAt: variant.createdAt.toISOString(),
    updatedAt: variant.updatedAt.toISOString(),
  };
  return ok(dto);
}

export async function PATCH(req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) return error;

  const variant = await loadOwned(id);
  if (!variant) {
    return err(ErrorCodes.NOT_FOUND, "Variant not found", 404);
  }

  const body = await req.json();
  const parsed = resumeVariantPatchSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid body", 422, parsed.error.issues);
  }

  const updated = await db.resumeVariant.update({
    where: { id },
    data: {
      label: parsed.data.label ?? undefined,
      jobUrl: parsed.data.jobUrl === undefined ? undefined : parsed.data.jobUrl,
      applicationId:
        parsed.data.applicationId === undefined ? undefined : parsed.data.applicationId,
      content: parsed.data.content ? JSON.stringify(parsed.data.content) : undefined,
      diffNotes: parsed.data.diffNotes === undefined ? undefined : parsed.data.diffNotes,
    },
  });
  return ok({ id: updated.id });
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) return error;

  const variant = await loadOwned(id);
  if (!variant) {
    return err(ErrorCodes.NOT_FOUND, "Variant not found", 404);
  }

  await db.resumeVariant.delete({ where: { id } });
  return ok({ deleted: id });
}
