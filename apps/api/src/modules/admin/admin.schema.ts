import { z } from "zod/v4";
import { publicUserSchema } from "@/modules/auth/auth.schema";
import { paginatedResponseSchema } from "@/types/response";

// ── Response schemas ──────────────────────────────────────────────────────────

/** A user as the admin table sees them: the public user plus activity and the caller's rights. */
export const adminUserSchema = publicUserSchema.extend({
  profileId: z.uuid().nullable(),
  name: z.string().nullable(),
  applicationCount: z.number().int(),
  lastActiveAt: z.date().nullable(),
  /** Whether the *calling* admin may change this row's role - the server owns that policy. */
  canChangeRole: z.boolean(),
});

export const adminUserPageSchema = paginatedResponseSchema(adminUserSchema);

/** A global board row plus `adoption` - how many profiles have linked it. */
export const adminBoardRecordSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  domain: z.string(),
  searchUrl: z.string().nullable(),
  listed: z.boolean(),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
  adoption: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const adminBoardListSchema = z.array(adminBoardRecordSchema);

/** Platform-wide counters. `signupsPerDay.date` is a `YYYY-MM-DD` bucket key, not a timestamp. */
export const adminStatsSchema = z.object({
  users: z.object({
    total: z.number().int(),
    verified: z.number().int(),
    admins: z.number().int(),
    newThisWeek: z.number().int(),
    active: z.number().int(),
  }),
  content: z.object({
    profiles: z.number().int(),
    campaigns: z.number().int(),
    activeCampaigns: z.number().int(),
    applications: z.number().int(),
    applicationsThisWeek: z.number().int(),
    boards: z.number().int(),
    boardLinks: z.number().int(),
  }),
  statusBreakdown: z.array(z.object({ status: z.string(), count: z.number().int() })),
  topBoards: z.array(z.object({ board: z.string(), count: z.number().int() })),
  signupsPerDay: z.array(z.object({ date: z.string(), count: z.number().int() })),
});
