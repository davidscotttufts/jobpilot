import { z } from "zod/v4";
import { pilotSearchCadenceSchema, pilotSearchScheduleFields } from "./schedule";

// The pilot's user-visible one-liner on why it chose this search; capped and rendered plain.
const reasonSchema = z.string().max(500).default("");

const pilotSearchFields = z.object({
  query: z.string().min(1),
  board: z.string().optional(),
  // Base resume discovery scores against; carried onto the discovered campaign's config.
  resumeId: z.string().optional(),
  reason: reasonSchema,
  // Overrides the pilot's instructions-wide defaults for the campaigns this search opens. Unset
  // keeps the old behaviour: the pilot config supplies both.
  minScore: z.number().int().min(0).max(100).nullable().optional(),
  maxApplications: z.number().int().min(1).max(500).nullable().optional(),
  ...pilotSearchScheduleFields,
});

/** A weekly cadence with no day selected would never come due - reject it at the edge. */
function weeklyNeedsDays(value: { cadence?: string; cadenceDays?: number[] }): boolean {
  return value.cadence !== "weekly" || (value.cadenceDays?.length ?? 0) > 0;
}

const WEEKLY_DAYS_REQUIRED = {
  message: "Pick at least one day for a weekly schedule.",
  path: ["cadenceDays"],
};

export const createPilotSearchSchema = pilotSearchFields
  .extend({
    /** Repeat an existing campaign: links it so discovery reuses it instead of opening a second. */
    campaignId: z.uuid().optional(),
  })
  .refine(weeklyNeedsDays, WEEKLY_DAYS_REQUIRED);

/** Partial patch: an omitted field is left unchanged (the pilot is the single writer). */
export const updatePilotSearchSchema = pilotSearchFields
  .partial()
  .refine(weeklyNeedsDays, WEEKLY_DAYS_REQUIRED);

/** The agent's post-run report; the service turns it into the next-run schedule. */
export const reportPilotSearchRunSchema = z.object({
  jobsSeen: z.number().int().min(0),
  newJobs: z.number().int().min(0),
  reachedEnd: z.boolean(),
});

export const pilotSearchSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  query: z.string(),
  board: z.string().nullable(),
  resumeId: z.string().nullable(),
  reason: z.string(),
  minScore: z.number().int().nullable(),
  maxApplications: z.number().int().nullable(),
  cadence: pilotSearchCadenceSchema,
  cadenceDays: z.array(z.number().int()),
  cadenceHour: z.number().int(),
  cadenceTimeZone: z.string(),
  lastRunAt: z.date().nullable(),
  lastJobsSeen: z.number().int().nullable(),
  lastNewJobs: z.number().int().nullable(),
  // Consecutive zero-new-jobs runs; clients derive "backing off" from `emptyRuns >= 3`.
  emptyRuns: z.number().int(),
  nextRunAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const pilotSearchListSchema = z.array(pilotSearchSchema);

export type CreatePilotSearchInput = z.infer<typeof createPilotSearchSchema>;
export type UpdatePilotSearchInput = z.infer<typeof updatePilotSearchSchema>;
export type ReportPilotSearchRunInput = z.infer<typeof reportPilotSearchRunSchema>;
export type PilotSearch = z.infer<typeof pilotSearchSchema>;
