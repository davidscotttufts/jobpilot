import { z } from "zod/v4";

/** Site-wide totals for the landing page. No per-user data. */
export const publicStatsSchema = z.object({
  jobListings: z.number().int(),
  applicationsLast30Days: z.number().int(),
  activeUsersLast30Days: z.number().int(),
});

export type PublicStats = z.infer<typeof publicStatsSchema>;
