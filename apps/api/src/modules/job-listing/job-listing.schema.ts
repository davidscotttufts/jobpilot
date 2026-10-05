import { jobListingStatusSchema } from "@jobpilot/contracts/job-listing";
import { paginatedSchema } from "@jobpilot/contracts/pagination";
import { z } from "zod/v4";

/** Where one posting was seen. Board + link only - never who found it. */
const jobListingSourceSchema = z.object({
  /** The board's display name ("LinkedIn"), or its bare host when the catalog has no listed row. */
  board: z.string().nullable(),
  url: z.string(),
  lastSeenAt: z.date(),
});

/** The privacy contract: no userId, campaignId, matchScore or appliedAt may ever appear here. */
const jobListingSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  remote: z.boolean(),
  salary: z.string().nullable(),
  employmentType: z.string().nullable(),
  skills: z.array(z.string()),
  descriptionExcerpt: z.string().nullable(),
  firstSeenAt: z.date(),
  lastSeenAt: z.date(),
  /** How many source links were merged into this listing. Reposts count, so this is not boards. */
  sourceCount: z.number().int(),
  /** Distinct board names, most recently seen first. */
  boards: z.array(z.string()),
});

/** The detail view adds the board links and the brief fields the list has no room for. */
export const jobListingSchema = jobListingSummarySchema.extend({
  requirements: z.array(z.string()),
  responsibilities: z.array(z.string()),
  yearsExperience: z.number().int().nullable(),
  sources: z.array(jobListingSourceSchema),
});

export const jobListingPageSchema = paginatedSchema(jobListingSummarySchema);

/** Bounded at six, so a bare array. */
export const similarJobListingsSchema = z.array(jobListingSummarySchema);

/** The `?tech=` option list: what the index actually contains, so the filter can't be guessed wrong. */
export const jobListingFacetsSchema = z.object({
  skills: z.array(z.object({ value: z.string(), count: z.number().int() })),
});

/** Slug + freshness only: the web's sitemap needs nothing else. */
export const jobListingSitemapSchema = z.array(
  z.object({ slug: z.string(), lastSeenAt: z.date() }),
);

export const adminJobListingSchema = jobListingSummarySchema.extend({
  status: jobListingStatusSchema,
  createdAt: z.date(),
});

export const adminJobListingPageSchema = paginatedSchema(adminJobListingSchema);
