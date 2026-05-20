import { getActiveProfileIdOrNull } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { profileWithAutoApplySchema } from "@/lib/schemas/profile";
import { resumePath } from "@/lib/storage";

const PROFILE_SCALAR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  website: true,
  linkedin: true,
  github: true,
  street: true,
  aptUnit: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  usAuthorized: true,
  requiresSponsorship: true,
  visaStatus: true,
  optExtension: true,
  willingToRelocate: true,
  preferredLocations: true,
  eeoGender: true,
  eeoRace: true,
  eeoEthnicity: true,
  eeoHispanicOrLatino: true,
  eeoVeteranStatus: true,
  eeoDisabilityStatus: true,
  primaryResumeId: true,
  updatedAt: true,
} as const;

export async function GET() {
  const id = await getActiveProfileIdOrNull();
  if (id === null) {
    return ok({
      profile: null,
      autoApply: null,
      primaryResumeSourceAbsolutePath: null,
      resumes: [],
    });
  }

  const profile = await db.profile.findUnique({
    where: { id },
    select: PROFILE_SCALAR_SELECT,
  });

  if (!profile) {
    return ok({
      profile: null,
      autoApply: null,
      primaryResumeSourceAbsolutePath: null,
      resumes: [],
    });
  }

  const [autoApply, primarySource, resumeRows, withContent] = await Promise.all([
    db.autoApplySettings.findUnique({ where: { profileId: id } }),
    profile.primaryResumeId
      ? db.resume.findUnique({
          where: { id: profile.primaryResumeId },
          select: { sourceFilename: true },
        })
      : Promise.resolve(null),
    db.resume.findMany({
      where: { profileId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        label: true,
        sourceFilename: true,
        updatedAt: true,
        _count: { select: { variants: true } },
      },
    }),
    db.resume.findMany({
      where: { profileId: id, content: { not: null } },
      select: { id: true },
    }),
  ]);

  const hasContentIds = new Set(withContent.map((r) => r.id));
  const resumes = resumeRows.map((r) => ({
    id: r.id,
    label: r.label,
    sourceFilename: r.sourceFilename,
    hasData: hasContentIds.has(r.id),
    variantCount: r._count.variants,
    isPrimary: r.id === profile.primaryResumeId,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return ok({
    profile: {
      ...profile,
      preferredLocations: JSON.parse(profile.preferredLocations) as string[],
      updatedAt: profile.updatedAt.toISOString(),
    },
    autoApply,
    primaryResumeSourceAbsolutePath: primarySource?.sourceFilename
      ? resumePath(primarySource.sourceFilename)
      : null,
    resumes,
  });
}

export async function PUT(req: Request) {
  const id = await getActiveProfileIdOrNull();
  if (id === null) {
    return err(
      ErrorCodes.UNPROCESSABLE,
      "No active profile. Create one via POST /api/profiles.",
      422,
    );
  }

  const body = await req.json();
  const parsed = profileWithAutoApplySchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid profile payload", 422, parsed.error.issues);
  }

  const { autoApply, preferredLocations, primaryResumeId, ...profileFields } = parsed.data;
  const preferredLocationsJson = JSON.stringify(preferredLocations);

  await db.profile.update({
    where: { id },
    data: {
      ...profileFields,
      preferredLocations: preferredLocationsJson,
      primaryResumeId: primaryResumeId ?? null,
    },
  });

  if (autoApply) {
    await db.autoApplySettings.upsert({
      where: { profileId: id },
      create: { profileId: id, ...autoApply },
      update: autoApply,
    });
  }

  return ok({ id });
}
