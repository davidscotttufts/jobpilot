import { jobListingStatusSchema } from "@jobpilot/contracts/job-listing";
import { paginatedSchema } from "@jobpilot/contracts/pagination";
import { z } from "zod/v4";

/** Where one posting was seen. Board + link only - never who found it. */
export const jobListingSourceSchema = z.object({
  board: z.string().nullable(),
  url: z.string(),
  lastSeenAt: z.date(),
});

/** The privacy contract: no userId, campaignId, matchScore or appliedAt may ever appear here. */
export const jobListingSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  remote: z.boolean(),
  salary: z.string().nullable(),
  employmentType: z.string().nullable(),
  techStack: z.array(z.string()),
  descriptionExcerpt: z.string().nullable(),
  firstSeenAt: z.date(),
  lastSeenAt: z.date(),
  /** How many boards this posting was found on - the list renders the count, not the links. */
  sourceCount: z.number().int(),
});

/** The detail view adds the board links themselves. */
export const jobListingSchema = jobListingSummarySchema.extend({
  sources: z.array(jobListingSourceSchema),
});

export const jobListingPageSchema = paginatedSchema(jobListingSummarySchema);

/** The `?tech=` option list: what the index actually contains, so the filter can't be guessed wrong. */
export const jobListingFacetsSchema = z.object({
  tech: z.array(z.object({ value: z.string(), count: z.number().int() })),
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
