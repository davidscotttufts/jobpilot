import {
  type PortfolioSettingsPatch,
  type ProfileWithAutoApplyInput,
  parseAvailability,
  type SalaryCurrency,
  type SalaryPeriod,
} from "@jobpilot/contracts/profile";
import { singleton } from "tsyringe";
import { conflict, findOwned, notFound } from "@/common/errors";
import { resumePath } from "@/common/storage";
import { PrismaClient } from "@/generated/prisma/client";

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

@singleton()
export class ProfileService {
  constructor(private readonly prisma: PrismaClient) {}

  async get(profileId: string) {
    const profile = await findOwned(
      (where) => this.prisma.profile.findFirst({ where, select: PROFILE_SCALAR_SELECT }),
      { id: profileId },
      "Profile",
    );

    const [autoApply, primarySource, resumeRows, withContent, references, salaryPreferences] =
      await Promise.all([
        this.prisma.autoApplySettings.findUnique({ where: { profileId } }),
        profile.primaryResumeId
          ? this.prisma.resume.findUnique({
              where: { id: profile.primaryResumeId },
              select: { sourceFilename: true },
            })
          : Promise.resolve(null),
        this.prisma.resume.findMany({
          where: { profileId },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            label: true,
            sourceFilename: true,
            updatedAt: true,
            _count: { select: { variants: true } },
          },
        }),
        this.prisma.resume.findMany({
          where: { profileId, content: { not: null } },
          select: { id: true },
        }),
        this.prisma.reference.findMany({
          where: { profileId },
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            relationship: true,
            company: true,
            email: true,
            phone: true,
          },
        }),
        this.prisma.salaryPreference.findMany({
          where: { profileId },
          orderBy: { position: "asc" },
          select: {
            id: true,
            appliesTo: true,
            minAmount: true,
            maxAmount: true,
            currency: true,
            period: true,
          },
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
      updatedAt: r.updatedAt,
    }));

    return {
      profile: {
        ...profile,
        preferredLocations: JSON.parse(profile.preferredLocations) as string[],
        references,
        // The columns are plain TEXT; assert the enums the response schema declares.
        salaryPreferences: salaryPreferences as ((typeof salaryPreferences)[number] & {
          currency: SalaryCurrency;
          period: SalaryPeriod;
        })[],
        updatedAt: profile.updatedAt,
      },
      autoApply,
      primaryResumeSourceAbsolutePath: primarySource?.sourceFilename
        ? resumePath(primarySource.sourceFilename)
        : null,
      resumes,
    };
  }

  async update(profileId: string, body: ProfileWithAutoApplyInput) {
    const {
      autoApply,
      preferredLocations,
      primaryResumeId,
      references,
      salaryPreferences,
      ...profileFields
    } = body;
    const preferredLocationsJson = JSON.stringify(preferredLocations);

    await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        ...profileFields,
        preferredLocations: preferredLocationsJson,
        primaryResumeId: primaryResumeId ?? null,
      },
    });

    // Replace the reference and salary-preference sets wholesale - the settings form submits the full lists.
    await this.prisma.$transaction([
      this.prisma.reference.deleteMany({ where: { profileId } }),
      this.prisma.reference.createMany({
        data: references.map((r, i) => ({
          profileId,
          name: r.name,
          relationship: r.relationship ?? null,
          company: r.company ?? null,
          email: r.email ?? null,
          phone: r.phone ?? null,
          position: i,
        })),
      }),
      this.prisma.salaryPreference.deleteMany({ where: { profileId } }),
      this.prisma.salaryPreference.createMany({
        data: salaryPreferences.map((s, i) => ({
          profileId,
          appliesTo: s.appliesTo,
          minAmount: s.minAmount ?? null,
          maxAmount: s.maxAmount ?? null,
          currency: s.currency,
          period: s.period,
          position: i,
        })),
      }),
    ]);

    if (autoApply) {
      await this.prisma.autoApplySettings.upsert({
        where: { profileId },
        create: { profileId, ...autoApply },
        update: autoApply,
      });
    }

    return { id: profileId };
  }

  /** Point the profile at one of its own resumes (or clear it with `null`). */
  async setPrimaryResume(profileId: string, resumeId: string | null) {
    if (resumeId !== null) {
      await findOwned(
        (where) => this.prisma.resume.findFirst({ where, select: { id: true } }),
        { id: resumeId, profileId },
        "Resume",
      );
    }

    await this.prisma.profile.update({
      where: { id: profileId },
      data: { primaryResumeId: resumeId },
    });

    return { primaryResumeId: resumeId };
  }

  async getPortfolioSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, availability: true },
    });
    if (!user) throw notFound("User not found");
    return {
      username: user.username,
      availability: parseAvailability(user.availability),
    };
  }

  /** Free when no other user holds it; the caller's own current username also reads as free.
   *  `username` arrives already normalized by `usernameSchema` on the route. */
  async checkUsername(userId: string, username: string) {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return { available: !owner || owner.id === userId };
  }

  async updatePortfolioSettings(userId: string, body: PortfolioSettingsPatch) {
    if (body.username !== undefined) {
      const taken = await this.prisma.user.findUnique({
        where: { username: body.username },
        select: { id: true },
      });
      if (taken && taken.id !== userId) {
        throw conflict("That username is already taken.");
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.username !== undefined && { username: body.username }),
        ...(body.availability !== undefined && { availability: body.availability }),
      },
      select: { username: true, availability: true },
    });

    return {
      username: updated.username,
      availability: parseAvailability(updated.availability),
    };
  }
}
