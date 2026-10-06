import { availabilitySchema } from "@jobpilot/contracts/user";
import { z } from "zod/v4";

/** `date` is UTC midnight of the bucketed day, so render it in UTC. */
const portfolioDayPointSchema = z.object({
  date: z.date(),
  count: z.number().int(),
});

const portfolioStatsSchema = z.object({
  applications: z.number().int(),
  interviews: z.number().int(),
  messagesSent: z.number().int(),
  applicationsLast30: z.number().int(),
  currentStreak: z.number().int(),
  longestStreak: z.number().int(),
});

/** Public, so never email, address, EEO answers or work authorization. */
export const portfolioSchema = z.object({
  username: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  availability: availabilitySchema.nullable(),
  summary: z.string().nullable(),
  links: z.object({
    website: z.string().nullable(),
    linkedin: z.string().nullable(),
    github: z.string().nullable(),
  }),
  skills: z.array(z.string()),
  primaryResumeId: z.string().nullable(),
  perDay: z.array(portfolioDayPointSchema),
  stats: portfolioStatsSchema,
});

const leaderboardWindowSchema = z.enum(["week", "month", "all"]);

export const leaderboardQuerySchema = z.object({
  window: leaderboardWindowSchema.optional(),
});

const leaderboardRowSchema = z.object({
  rank: z.number().int(),
  username: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  availability: availabilitySchema.nullable(),
  applications: z.number().int(),
  messagesSent: z.number().int(),
  activityCount: z.number().int(),
});

export const leaderboardResponseSchema = z.object({
  window: leaderboardWindowSchema,
  /** Active users in the window, counted before the row cap - not a registered-user count. */
  totalActive: z.number().int(),
  rows: z.array(leaderboardRowSchema),
});

export const portfolioSitemapSchema = z.array(
  z.object({
    username: z.string(),
    updatedAt: z.date(),
  }),
);

export type PortfolioResponse = z.infer<typeof portfolioSchema>;
export type LeaderboardWindow = z.infer<typeof leaderboardWindowSchema>;
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
