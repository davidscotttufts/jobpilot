import { z } from "zod/v4";
import { cleanReplacementChars } from "@/utils/text";

/** A free-text string with mangled replacement-char artifacts cleaned on write. */
const reasonText = z.string().transform(cleanReplacementChars);

export const RUN_STATUSES = [
  "in_progress",
  "paused",
  "interrupted",
  "completed",
  "failed",
] as const;
export const runStatusSchema = z.enum(RUN_STATUSES);

export const RUN_SOURCES = ["search", "auto-apply", "apply"] as const;
export const runSourceSchema = z.enum(RUN_SOURCES);

export const RUN_JOB_STATUSES = [
  "pending",
  "approved",
  "applying",
  "applied",
  "failed",
  "skipped",
] as const;
export const runJobStatusSchema = z.enum(RUN_JOB_STATUSES);

export const runConfigSchema = z.object({
  board: z.string().min(1).optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  maxApplications: z.number().int().min(1).max(500).optional(),
  maxJobs: z.number().int().min(1).max(100).optional(),
});

export const runSummarySchema = z.object({
  totalFound: z.number().int().min(0).default(0),
  qualified: z.number().int().min(0).default(0),
  applied: z.number().int().min(0).default(0),
  failed: z.number().int().min(0).default(0),
  skipped: z.number().int().min(0).default(0),
  remaining: z.number().int().min(0).default(0),
});

export const createRunSchema = z.object({
  runId: z.string().min(1),
  query: z.string().min(1),
  source: runSourceSchema,
  config: runConfigSchema.optional(),
});

export const updateRunSchema = z.object({
  status: runStatusSchema.optional(),
  summary: runSummarySchema.partial().optional(),
  config: runConfigSchema.partial().optional(),
  completedAt: z.iso.datetime().optional().nullable(),
});

export const addRunJobSchema = z.object({
  jobKey: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional().nullable(),
  salary: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  url: z.url(),
  board: z.string().optional().nullable(),
  matchScore: z.number().int().min(0).max(100).optional().nullable(),
  matchReason: reasonText.optional().nullable(),
  status: runJobStatusSchema.optional(),
  description: z.string().optional().nullable(),
  jobDigest: z.string().optional().nullable(),
});

export const patchRunJobSchema = z.object({
  status: runJobStatusSchema.optional(),
  appliedAt: z.iso.datetime().optional().nullable(),
  failReason: reasonText.optional().nullable(),
  retryNotes: reasonText.optional().nullable(),
  skipReason: reasonText.optional().nullable(),
  matchScore: z.number().int().min(0).max(100).optional().nullable(),
  matchReason: reasonText.optional().nullable(),
  jobDigest: z.string().optional().nullable(),
});

export const RUN_JOB_TERMINAL_OUTCOMES = ["applied", "failed", "skipped"] as const;
export const runJobOutcomeSchema = z.enum(RUN_JOB_TERMINAL_OUTCOMES);

export const runJobResultSchema = z
  .object({
    outcome: runJobOutcomeSchema,
    appliedAt: z.iso.datetime().optional(),
    failReason: z.string().min(1).transform(cleanReplacementChars).optional(),
    skipReason: z.string().min(1).transform(cleanReplacementChars).optional(),
    retryNotes: reasonText.optional().nullable(),
    matchScore: z.number().int().min(0).max(100).optional(),
  })
  .refine(
    (v) =>
      (v.outcome !== "applied" || !!v.appliedAt) &&
      (v.outcome !== "failed" || !!v.failReason) &&
      (v.outcome !== "skipped" || !!v.skipReason),
    {
      message:
        "applied requires appliedAt; failed requires failReason; skipped requires skipReason.",
    },
  );

export type RunJobOutcome = z.infer<typeof runJobOutcomeSchema>;
export type RunJobResultInput = z.infer<typeof runJobResultSchema>;

export const RUN_EVENT_TYPES = ["log", "progress", "status", "job-update"] as const;
export const runEventTypeSchema = z.enum(RUN_EVENT_TYPES);

export const runEventSchema = z.object({
  type: runEventTypeSchema,
  payload: z.record(z.string(), z.unknown()),
});

export type RunStatus = z.infer<typeof runStatusSchema>;
export type RunJobStatus = z.infer<typeof runJobStatusSchema>;
export type RunConfig = z.infer<typeof runConfigSchema>;
export type RunSummary = z.infer<typeof runSummarySchema>;
export type CreateRunInput = z.infer<typeof createRunSchema>;
export type UpdateRunInput = z.infer<typeof updateRunSchema>;
export type AddRunJobInput = z.infer<typeof addRunJobSchema>;
export type PatchRunJobInput = z.infer<typeof patchRunJobSchema>;
export type RunSource = z.infer<typeof runSourceSchema>;
export type RunEventType = z.infer<typeof runEventTypeSchema>;
export type RunEventInput = z.infer<typeof runEventSchema>;
