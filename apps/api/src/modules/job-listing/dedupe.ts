/**
 * Dedupe keys for the public job index: which two scraped rows are the same posting.
 *
 * Not `normalizeJobTitle` from `scoring/applied-duplicates.ts` - that strips seniority tokens, which
 * would merge a Senior and a Junior opening at one company into a single public listing.
 */

import { createHash } from "node:crypto";
import { slugify } from "@/common/utils";
import { normalizeCompanyName } from "@/modules/scoring/applied-duplicates";
import { normalizePhrase } from "@/modules/scoring/keyword-normalize";

/** Query params that identify the referrer, not the posting. */
const TRACKING_PARAMS = [
  /^utm_/,
  /^gh_/,
  /^ref$/,
  /^refid$/,
  /^referer$/,
  /^referrer$/,
  /^source$/,
  /^src$/,
  /^trk$/,
  /^trackingid$/,
  /^origin$/,
  /^campaign$/,
  /^fbclid$/,
  /^gclid$/,
];

const REMOTE_PATTERNS = [
  /\bremote\b/,
  /\banywhere\b/,
  /\bwork from home\b/,
  /\bwfh\b/,
  /\bdistributed\b/,
];

/** Remote-ish text collapses to "remote"; anything else keeps its city, so "NY, NY, USA" == "NY, NY". */
export function normalizeListingLocation(location: string | null | undefined): string {
  if (!location) {
    return "";
  }
  const cleaned = location.toLowerCase();
  if (REMOTE_PATTERNS.some((pattern) => pattern.test(cleaned))) {
    return "remote";
  }
  return normalizePhrase(cleaned.split(",")[0] ?? "");
}

/**
 * Strip everything that varies between two links to one posting: host case, `www.`, tracking
 * params, fragment, trailing slash. Surviving params are sorted - boards emit them in any order.
 */
export function canonicalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return rawUrl.trim();
  }

  url.hash = "";
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((pattern) => pattern.test(key.toLowerCase()))) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();

  const query = url.searchParams.toString();
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}${query ? `?${query}` : ""}`;
}

export interface DedupeInput {
  title: string;
  company: string;
  location?: string | null;
}

/**
 * The dedupe key: sha256 of the normalized posting. Location is in it because the same role opened
 * in two cities is two postings. (`Job.digest` is the agent's JSON summary, not a hash - different
 * thing entirely, despite the name.)
 */
export function dedupeKey(input: DedupeInput): string {
  const parts = [
    normalizePhrase(input.title),
    normalizeCompanyName(input.company),
    normalizeListingLocation(input.location),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

/** SEO slug. The key suffix makes it collision-free without a retry loop, and stable. */
export function listingSlug(input: DedupeInput, key: string = dedupeKey(input)): string {
  const stem = [slugify(input.title), "at", slugify(input.company)].filter(Boolean).join("-");
  return `${stem}-${key.slice(0, 6)}`;
}
