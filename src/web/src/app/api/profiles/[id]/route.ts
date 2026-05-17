import { setActiveProfileId } from "@/lib/active-profile";
import { parsePathParams, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { profileWithAutopilotSchema } from "@/lib/schemas/profile";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id: idStr } = await parsePathParams(ctx);
  const id = Number(idStr);

  if (!Number.isInteger(id)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid profile id", 400);
  }

  const profile = await db.profile.findUnique({
    where: { id },
    include: { autopilot: true },
  });

  if (!profile) {
    return err(ErrorCodes.NOT_FOUND, "Profile not found", 404);
  }

  return ok({
    profile: {
      ...profile,
      preferredLocations: JSON.parse(profile.preferredLocations) as string[],
    },
    autopilot: profile.autopilot
      ? {
          ...profile.autopilot,
          skipCompanies: JSON.parse(profile.autopilot.skipCompanies) as string[],
          skipTitleKeywords: JSON.parse(profile.autopilot.skipTitleKeywords) as string[],
        }
      : null,
  });
}

export async function PUT(req: Request, ctx: Params) {
  const { id: idStr } = await parsePathParams(ctx);
  const id = Number(idStr);

  if (!Number.isInteger(id)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid profile id", 400);
  }

  const exists = await db.profile.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    return err(ErrorCodes.NOT_FOUND, "Profile not found", 404);
  }

  const body = await req.json();
  const parsed = profileWithAutopilotSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid profile payload", 422, parsed.error.issues);
  }

  const { autopilot, preferredLocations, primaryResumeId, ...profileFields } = parsed.data;
  const preferredLocationsJson = JSON.stringify(preferredLocations);

  await db.profile.update({
    where: { id },
    data: {
      ...profileFields,
      preferredLocations: preferredLocationsJson,
      primaryResumeId: primaryResumeId ?? null,
    },
  });

  if (autopilot) {
    await db.autopilotSettings.upsert({
      where: { profileId: id },
      create: {
        profileId: id,
        ...autopilot,
        skipCompanies: JSON.stringify(autopilot.skipCompanies),
        skipTitleKeywords: JSON.stringify(autopilot.skipTitleKeywords),
      },
      update: {
        ...autopilot,
        skipCompanies: JSON.stringify(autopilot.skipCompanies),
        skipTitleKeywords: JSON.stringify(autopilot.skipTitleKeywords),
      },
    });
  }

  return ok({ id });
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id: idStr } = await parsePathParams(ctx);
  const id = Number(idStr);
  if (!Number.isInteger(id)) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid profile id", 400);
  }

  const target = await db.profile.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  if (!target) {
    return err(ErrorCodes.NOT_FOUND, "Profile not found", 404);
  }

  const total = await db.profile.count();
  if (total <= 1) {
    return err(ErrorCodes.CONFLICT, "Cannot delete the last remaining profile", 409);
  }

  await db.profile.delete({ where: { id } });

  if (target.isActive) {
    const next = await db.profile.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
    if (next) {
      await setActiveProfileId(next.id);
    }
  }

  return ok({ id });
}
