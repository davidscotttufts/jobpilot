import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { profileWithAutoApplySchema } from "@/lib/schemas/profile";

export async function GET() {
  const profiles = await db.profile.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
    },
  });

  return ok(profiles);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = profileWithAutoApplySchema.partial().safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid profile payload", 422, parsed.error.issues);
  }

  const { autoApply, preferredLocations, primaryResumeId, ...profileFields } = parsed.data;
  const hasActive = await db.profile.findFirst({ where: { isActive: true }, select: { id: true } });

  const profile = await db.profile.create({
    data: {
      firstName: profileFields.firstName ?? "",
      lastName: profileFields.lastName ?? "",
      email: profileFields.email ?? "",
      phone: profileFields.phone ?? null,
      website: profileFields.website ?? null,
      linkedin: profileFields.linkedin ?? null,
      github: profileFields.github ?? null,
      street: profileFields.street ?? null,
      aptUnit: profileFields.aptUnit ?? null,
      city: profileFields.city ?? null,
      state: profileFields.state ?? null,
      zipCode: profileFields.zipCode ?? null,
      country: profileFields.country ?? null,
      usAuthorized: profileFields.usAuthorized ?? false,
      requiresSponsorship: profileFields.requiresSponsorship ?? false,
      visaStatus: profileFields.visaStatus ?? null,
      optExtension: profileFields.optExtension ?? null,
      willingToRelocate: profileFields.willingToRelocate ?? false,
      preferredLocations: JSON.stringify(preferredLocations ?? []),
      eeoGender: profileFields.eeoGender ?? null,
      eeoRace: profileFields.eeoRace ?? null,
      eeoEthnicity: profileFields.eeoEthnicity ?? null,
      eeoHispanicOrLatino: profileFields.eeoHispanicOrLatino ?? null,
      eeoVeteranStatus: profileFields.eeoVeteranStatus ?? null,
      eeoDisabilityStatus: profileFields.eeoDisabilityStatus ?? null,
      primaryResumeId: primaryResumeId ?? null,
      isActive: !hasActive,
      autoApply: { create: autoApply ?? {} },
    },
  });

  return ok({ id: profile.id }, { status: 201 });
}
