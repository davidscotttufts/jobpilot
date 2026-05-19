import { z } from "zod/v4";
import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import type { ResumeData } from "@/lib/schemas/resume";
import { fitProfileSchema, jobDigestSchema, scoreFit } from "@/lib/scoring/fit";

const requestSchema = z.object({
  digest: jobDigestSchema,
  profile: fitProfileSchema.partial().optional(),
});

/** Calculates the number of years since the earliest experience date in the resume content */
function yearsSinceEarliestExperience(content: ResumeData): number | null {
  const dates = (content.experience ?? [])
    .map((e) => e.start)
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .map((s) => new Date(s))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    return null;
  }

  const yearsDiff = (Date.now() - dates[0].getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.round(yearsDiff));
}

/** Derives the fit inputs for a profile based on their resume content */
function deriveProfileFitInputs(content: ResumeData): {
  techStack: string[];
  yearsExperience: number | null;
} {
  const techStack = (content.skills ?? []).flatMap((group) => group.items ?? []).filter(Boolean);
  return { techStack, yearsExperience: yearsSinceEarliestExperience(content) };
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid score-fit payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { primaryResumeId: true },
  });

  let derived = { techStack: [] as string[], yearsExperience: null as number | null };

  if (profile?.primaryResumeId) {
    const resume = await db.resume.findUnique({
      where: { id: profile.primaryResumeId },
      select: { content: true },
    });

    if (resume?.content) {
      try {
        derived = deriveProfileFitInputs(JSON.parse(resume.content) as ResumeData);
      } catch {
        // resume content malformed — fall back to caller-provided profile only
      }
    }
  }

  const fitProfile = {
    techStack: parsed.data.profile?.techStack ?? derived.techStack,
    yearsExperience:
      parsed.data.profile?.yearsExperience !== undefined
        ? parsed.data.profile.yearsExperience
        : derived.yearsExperience,
  };

  const result = scoreFit(parsed.data.digest, fitProfile);
  return ok(result);
}
