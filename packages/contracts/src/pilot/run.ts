import { z } from "zod/v4";
import { taskFieldsSchema } from "./tasks";

export const PILOT_RUN_OUTCOMES = ["done", "failed", "abandoned", "expired"] as const;

/** The subset an agent may report on finish; "expired" is only ever set server-side. */
const finishableOutcomeSchema = z.enum(["done", "failed", "abandoned"]);

export const startPilotRunSchema = z.object({
  taskListVersion: z.uuid(),
  taskId: z.string().min(1),
});

export const finishPilotRunSchema = z.object({
  outcome: finishableOutcomeSchema,
  note: z.string().optional(),
});

export const reportPilotUsageSchema = z.object({
  // Elapsed time on the host's own clock, so a skewed machine clock still finds the cycle's run.
  cycleSeconds: z.number().int().min(0),
  model: z.string().min(1),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cacheReadTokens: z.number().int().min(0),
  cacheWriteTokens: z.number().int().min(0),
});

const pilotRunBaseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  startedAt: z.date(),
  heartbeatAt: z.date().nullable(),
  expiresAt: z.date(),
  finishedAt: z.date().nullable(),
  outcome: z.enum(PILOT_RUN_OUTCOMES).nullable(),
});

export const pilotRunSchema = z.intersection(pilotRunBaseSchema, taskFieldsSchema);

export type FinishPilotRunInput = z.infer<typeof finishPilotRunSchema>;
export type PilotRun = z.infer<typeof pilotRunSchema>;
export type ReportPilotUsageInput = z.infer<typeof reportPilotUsageSchema>;
