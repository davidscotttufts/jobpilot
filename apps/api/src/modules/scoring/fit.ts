import { detectEligibilityRestrictions, type EligibilityRestriction } from "./eligibility";
import { expandSynonyms, normalizeKeyword, normalizePhrase } from "./keyword-normalize";
import type { FitProfile, JobDigest } from "./scoring.schema";

export interface FitResult {
  score: number;
  confidence: number;
  strongMatches: string[];
  partialMatches: string[];
  gaps: string[];
  /**
   * Set when the posting states a bar this candidate cannot clear. Kept out of `score` so a
   * 90-point tech match still reads as 90 and the skip reason stays the real one.
   */
  eligibilityBlocked?: EligibilityRestriction;
}

// Words that carry meaning on their own inside a multi-word term ("net", "sql" - not "ms").
const WORD_MIN_LENGTH = 3;

const termWords = (term: string): string[] => {
  const words = normalizePhrase(term).split(" ");
  return words.length > 1 ? words.filter((w) => w.length >= WORD_MIN_LENGTH) : [];
};

/** Full-term variants plus word-level ones, so "ASP.NET Core" still matches a digest's ".NET". */
const termVariants = (term: string): string[] => {
  const variants = new Set(expandSynonyms(term));
  for (const word of termWords(term)) {
    for (const variant of expandSynonyms(word)) {
      variants.add(variant);
    }
  }
  return [...variants];
};

const normalizedHas = (set: Set<string>, term: string): boolean =>
  termVariants(term).some((variant) => set.has(variant));

/**
 * Heuristic keyword-overlap fit score. Server-side, deterministic, no LLM.
 * The model uses this to skip full deliberation on confident high/low scores
 * and only reason about borderline cases.
 *
 * Weights:
 *   50% tech overlap (weighted Jaccard with synonyms)
 *   20% years-experience proximity
 *   30% keyword density in requirements
 */
export function scoreFit(digest: JobDigest, profile: FitProfile): FitResult {
  const digestTech = (digest.techStack || []).filter(Boolean);
  const profileTechNormed = new Set<string>((profile.techStack || []).flatMap(termVariants));

  const strongMatches: string[] = [];
  const gaps: string[] = [];

  for (const term of digestTech) {
    if (normalizedHas(profileTechNormed, term)) {
      strongMatches.push(term);
    } else {
      gaps.push(term);
    }
  }

  const techOverlapScore = digestTech.length === 0 ? 0 : strongMatches.length / digestTech.length;
  let yearsScore = 0.5;

  if (
    digest.yearsExperience !== null &&
    digest.yearsExperience !== undefined &&
    profile.yearsExperience !== null
  ) {
    const gap = profile.yearsExperience! - digest.yearsExperience;
    if (gap >= 0) {
      yearsScore = 1;
    } else {
      yearsScore = Math.max(0, 1 + gap / 5);
    }
  }

  const reqText = (digest.requirements || []).join(" ").toLowerCase();
  let reqHits = 0;
  const partialMatches: string[] = [];

  for (const term of digestTech) {
    if (reqText.includes(normalizeKeyword(term))) {
      reqHits++;
      if (!strongMatches.includes(term) && !partialMatches.includes(term)) {
        partialMatches.push(term);
      }
    }
  }

  // No requirements text leaves the density term neutral - a perfect tech match must not cap at 70.
  const reqDensityScore =
    digestTech.length === 0 || reqText.trim().length === 0
      ? techOverlapScore
      : reqHits / digestTech.length;
  const raw = techOverlapScore * 0.5 + yearsScore * 0.2 + reqDensityScore * 0.3;
  const score = Math.round(raw * 100);

  // A no-requirements digest tops out at 0.6, under the skills' 0.7 trust-without-deliberation bar.
  let confidence = 0;
  if (digestTech.length > 0) {
    confidence += 0.4;
  }
  if ((digest.requirements || []).length > 0) {
    confidence += 0.4;
  }
  if (digest.yearsExperience !== null && digest.yearsExperience !== undefined) {
    confidence += 0.2;
  }

  const restrictions = detectEligibilityRestrictions(
    digest.descriptionExcerpt,
    ...(digest.requirements ?? []),
    ...(digest.responsibilities ?? []),
  );
  // A sponsorship bar is only this candidate's problem when they need sponsorship; a stated
  // citizenship or clearance requirement bars anyone who lacks it, so it is never gated.
  const blocked = restrictions.find(
    (restriction) => restriction.kind !== "sponsorship" || profile.requiresSponsorship,
  );

  return {
    score,
    confidence: Math.round(confidence * 100) / 100,
    strongMatches,
    partialMatches: partialMatches.filter((t) => !strongMatches.includes(t)),
    gaps,
    ...(blocked && { eligibilityBlocked: blocked }),
  };
}
