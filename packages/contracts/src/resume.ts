import { z } from "zod/v4";
import { optionalPhoneSchema } from "./phone";
import { normalizeLinkUrl } from "./utils/url";

const linkUrl = z.string().transform(normalizeLinkUrl).optional();

export const resumeBasicsSchema = z.object({
  name: z.string().min(1, "Required"),
  headline: z.string().optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone: optionalPhoneSchema,
  website: linkUrl,
  linkedin: linkUrl,
  github: linkUrl,
  location: z.string().optional(),
});

export const resumeExperienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Required"),
  title: z.string().min(1, "Required"),
  location: z.string().optional(),
  start: z.string(),
  end: z.string().optional(),
  bullets: z.array(z.string()),
});

export const resumeProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Required"),
  url: linkUrl,
  description: z.string().optional(),
  bullets: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  // Free-text like the experience dates ("Jan 2025", "2024", "Present"). Optional because most
  // resumes list projects undated - but a project can only be promoted onto the experience
  // timeline if it has a real range, so filling these in is what unlocks that.
  start: z.string().optional(),
  end: z.string().optional(),
});

export const resumeSkillGroupSchema = z.object({
  id: z.string().optional(),
  group: z.string().min(1, "Required"),
  items: z.array(z.string()),
});

export const resumeEducationSchema = z.object({
  id: z.string().optional(),
  school: z.string().min(1, "Required"),
  degree: z.string().min(1, "Required"),
  start: z.string().optional(),
  end: z.string().optional(),
  details: z.array(z.string()).default([]),
});

export const resumeDataSchema = z.object({
  basics: resumeBasicsSchema,
  summary: z.string().optional(),
  experience: z.array(resumeExperienceSchema).default([]),
  projects: z.array(resumeProjectSchema).default([]),
  skills: z.array(resumeSkillGroupSchema).default([]),
  education: z.array(resumeEducationSchema).default([]),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;
export type ResumeBasics = z.infer<typeof resumeBasicsSchema>;
export type ResumeExperience = z.infer<typeof resumeExperienceSchema>;
export type ResumeProject = z.infer<typeof resumeProjectSchema>;
export type ResumeSkillGroup = z.infer<typeof resumeSkillGroupSchema>;
export type ResumeEducation = z.infer<typeof resumeEducationSchema>;

export const resumeVariantCreateSchema = z.object({
  label: z.string().min(1, "Required"),
  jobUrl: z.string().optional().nullable(),
  applicationId: z.uuid().optional().nullable(),
  content: resumeDataSchema,
  diffNotes: z.string().optional().nullable(),
});

export const resumeVariantPatchSchema = z.object({
  label: z.string().min(1).optional(),
  jobUrl: z.string().optional().nullable(),
  applicationId: z.uuid().optional().nullable(),
  content: resumeDataSchema.optional(),
  diffNotes: z.string().optional().nullable(),
});

export const EMPTY_RESUME_DATA: ResumeData = {
  basics: { name: "" },
  summary: "",
  experience: [],
  projects: [],
  skills: [],
  education: [],
};

/**
 * Roughly how many characters fit on one bullet line once rendered. Letter width less the template's
 * margins and bullet indent leaves ~498pt, and Helvetica at 9.5pt averages ~4.75pt a character. The
 * editor warns past two lines; nothing enforces it, since a long bullet is legal, just ugly.
 * Keep in step with `bulletList`/`bulletText` in `apps/api/src/common/pdf/jake-template.tsx`.
 */
export const RESUME_BULLET_CHARS_PER_LINE = 104;

// Variant labels that carry meaning beyond "a tailored copy", so sweeps must leave them alone and
// the reuse scorer must skip them. Shared so the prune endpoint, the retention cron, and the web
// panel agree - a prefix known to one and not the others deletes the thing it was meant to protect.

/** An agent-authored rewrite awaiting the user's accept or discard. */
export const SUGGESTED_REWRITE_LABEL = "Suggested rewrite";

/**
 * How long a variant no application ever used survives the retention sweep. Shared so the panel can
 * state the rule and the cron can enforce it from one number.
 */
export const UNUSED_VARIANT_DAYS = 30;

export const PROTECTED_VARIANT_LABELS = [SUGGESTED_REWRITE_LABEL] as const;

/** Whether a variant label is reserved, and so exempt from pruning and reuse scoring. */
export function isProtectedVariantLabel(label: string): boolean {
  return PROTECTED_VARIANT_LABELS.some((reserved) => label.startsWith(reserved));
}
