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

export const pilotRunResultSchema = z.object({
  outcome: z.enum(["done", "failed"]),
  // The journal action line, human and specific.
  summary: z.string().trim().min(1),
  subjectType: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  detail: z.record(z.string(), z.json()).optional(),
  // Durable board/site facts, journaled as `hint` entries.
  hints: z
    .array(z.object({ domain: z.string().min(1), text: z.string().trim().min(1) }))
    .max(3)
    .default([]),
});

export const reportPilotUsageSchema = z.object({
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
export type PilotRunResultInput = z.infer<typeof pilotRunResultSchema>;
export type ReportPilotUsageInput = z.infer<typeof reportPilotUsageSchema>;
