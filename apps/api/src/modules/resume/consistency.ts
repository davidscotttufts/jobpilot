// Compares a resume's contact block against the profile fields the form-filler submits. A recruiter
// reads the resume; the ATS row comes from the profile. Pure - no db, no env.
import type { ResumeBasics } from "@jobpilot/contracts/resume";

/** The profile fields a resume header can contradict. */
export interface ProfileContact {
  city: string | null;
  state: string | null;
  contactEmail: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

export interface ProfileMismatch {
  field: "location" | "email" | "phone" | "linkedin" | "github" | "website";
  resume: string;
  profile: string;
}

/** Case/punctuation/whitespace-insensitive. "+1 857 867 1942" and "(857) 867-1942" are one number. */
function loose(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Drops scheme, `www.`, and a trailing slash so a bare handle URL matches a full one. */
function looseUrl(value: string): string {
  return loose(
    value
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, ""),
  );
}

/** Digits only, minus a NANP country code: "+1 857…" and "(857)…" are the same phone. */
function loosePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/**
 * Matches when the resume names the profile's city in any format - "Portland, Maine" and
 * "Greater Portland, ME" both agree with city=Portland. Only a different place is reported.
 */
function locationAgrees(resume: string, city: string | null, state: string | null): boolean {
  // City is load-bearing: "MA" alone is inside "Massachusetts" but also "Amsterdam".
  const anchor = city?.trim() || state?.trim();
  return !anchor || loose(resume).includes(loose(anchor));
}

/**
 * Every field where the resume and profile disagree. A field absent from either side is a choice,
 * not a conflict.
 */
export function findProfileMismatches(
  basics: ResumeBasics | undefined,
  profile: ProfileContact,
): ProfileMismatch[] {
  if (!basics) {
    return [];
  }

  const mismatches: ProfileMismatch[] = [];
  const profileLocation = [profile.city, profile.state].filter(Boolean).join(", ");

  if (
    basics.location?.trim() &&
    profileLocation &&
    !locationAgrees(basics.location, profile.city, profile.state)
  ) {
    mismatches.push({ field: "location", resume: basics.location, profile: profileLocation });
  }

  // Per-field comparison: a plain string compare flags every "+1" and "https://" as a conflict.
  const checks = [
    { field: "email", resume: basics.email, profile: profile.contactEmail, normalize: loose },
    { field: "phone", resume: basics.phone, profile: profile.phone, normalize: loosePhone },
    { field: "linkedin", resume: basics.linkedin, profile: profile.linkedin, normalize: looseUrl },
    { field: "github", resume: basics.github, profile: profile.github, normalize: looseUrl },
    { field: "website", resume: basics.website, profile: profile.website, normalize: looseUrl },
  ] as const;

  for (const check of checks) {
    if (!check.resume?.trim() || !check.profile?.trim()) {
      continue;
    }
    if (check.normalize(check.resume) !== check.normalize(check.profile)) {
      mismatches.push({ field: check.field, resume: check.resume, profile: check.profile });
    }
  }

  return mismatches;
}
