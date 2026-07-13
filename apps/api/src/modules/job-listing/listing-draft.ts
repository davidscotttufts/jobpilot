/**
 * Turn a campaign `Job` row into a publishable public listing - or reject it. Pure and Prisma-free:
 * this is both the privacy boundary (only digest fields cross it) and the quality gate, so it is
 * the part that unit-tests with no database.
 */

import { z } from "zod/v4";
import { canonicalizeUrl, dedupeKey, listingSlug, normalizeListingLocation } from "./dedupe";

const MAX_EXCERPT = 600;

/**
 * Looser than scoring's `jobDigestSchema`, which strips the posting-shaped keys
 * (location/salary/remote) this index wants. `Job.digest` is raw JSON, so they are usually present.
 */
const digestSchema = z.object({
  techStack: z.array(z.string()).optional(),
  descriptionExcerpt: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  employmentType: z.string().optional(),
  remote: z.boolean().optional(),
});

/** The subset of a `Job` a listing may read. Anything user-identifying is absent by design. */
export interface ListingSourceJob {
  title: string;
  company: string;
  url: string;
  location?: string | null;
  salary?: string | null;
  type?: string | null;
  board?: string | null;
  description?: string | null;
  digest?: string | null;
}

export interface ListingDraft {
  dedupeKey: string;
  slug: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salary: string | null;
  employmentType: string | null;
  techStack: string[];
  descriptionExcerpt: string | null;
  board: string | null;
  url: string;
}

function parseDigest(raw: string | null | undefined): z.infer<typeof digestSchema> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = digestSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    // A malformed digest is a thin job, not an error - the next PATCH usually fixes it.
    return {};
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function excerpt(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.length > MAX_EXCERPT ? `${value.slice(0, MAX_EXCERPT).trimEnd()}…` : value;
}

/**
 * Build the draft, or null when the job is too thin to publish. No digest means a search-results
 * stub the agent never opened; skip it rather than store it hidden - the PATCH that adds the digest
 * re-runs this.
 */
export function buildListingDraft(job: ListingSourceJob): ListingDraft | null {
  const title = clean(job.title);
  const company = clean(job.company);
  const url = clean(job.url);
  if (!title || !company || !url) {
    return null;
  }

  const digest = parseDigest(job.digest);
  const techStack = (digest.techStack ?? []).map((tech) => tech.trim()).filter(Boolean);
  if (techStack.length === 0) {
    return null;
  }

  const location = clean(job.location) ?? clean(digest.location);
  const key = dedupeKey({ title, company, location });

  return {
    dedupeKey: key,
    slug: listingSlug({ title, company, location }, key),
    title,
    company,
    location,
    remote: digest.remote === true || normalizeListingLocation(location) === "remote",
    salary: clean(job.salary) ?? clean(digest.salary),
    employmentType: clean(job.type) ?? clean(digest.employmentType),
    techStack,
    descriptionExcerpt: excerpt(clean(digest.descriptionExcerpt) ?? clean(job.description)),
    // Lowercased so the `?board=` filter is an indexed equality hit, not an ILIKE scan.
    board: clean(job.board)?.toLowerCase() ?? null,
    url: canonicalizeUrl(url),
  };
}
