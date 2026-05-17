import { getActiveProfileIdOrNull } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { profileWithAutopilotSchema } from "@/lib/schemas/profile";
import { resumePath } from "@/lib/storage";

export async function GET() {
  const id = await getActiveProfileIdOrNull();
  if (id === null) {
    return ok({
      profile: null,
      autopilot: null,
      primaryResumeSourceAbsolutePath: null,
      resumes: [],
    });
  }

  const profile = await db.profile.findUnique({
    where: { id },
    include: {
      primaryResume: true,
      resumes: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { variants: true } } },
      },
      autopilot: true,
    },
  });

  if (!profile) {
    return ok({
      profile: null,
      autopilot: null,
      primaryResumeSourceAbsolutePath: null,
      resumes: [],
    });
  }

  const resumes = profile.resumes.map((r) => ({
    id: r.id,
    label: r.label,
    sourceFilename: r.sourceFilename,
    hasData: r.content !== null,
    variantCount: r._count.variants,
    isPrimary: r.id === profile.primaryResumeId,
    updatedAt: r.updatedAt.toISOString(),
  }));

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
    primaryResumeSourceAbsolutePath: profile.primaryResume?.sourceFilename
      ? resumePath(profile.primaryResume.sourceFilename)
      : null,
    resumes,
  });
}

export async function PUT(req: Request) {
  const id = await getActiveProfileIdOrNull();
  if (id === null) {
    return err(ErrorCodes.UNPROCESSABLE, "No active profile. Create one via POST /api/profiles.", 422);
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
