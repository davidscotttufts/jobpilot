import { z } from "zod/v4";
import { taskFieldsSchema } from "./tasks";

export const PILOT_RUN_OUTCOMES = ["done", "failed", "cancelled", "expired"] as const;

export const startPilotRunSchema = z.object({
  taskListVersion: z.uuid(),
  taskId: z.string().min(1),
});

export const pilotRunResultSchema = z.object({
  outcome: z.enum(["done", "failed"]),
  // The journal action line, human and specific.
  summary: z.string().trim().min(1),
  subjectType: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  detail: z.record(z.string(), z.json()).optional(),
});

export const reportPilotUsageSchema = z.object({
  model: z.string().min(1),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cacheReadTokens: z.number().int().min(0),
  cacheWriteTokens: z.number().int().min(0),
});

/** A run's token usage as the web reads it, split because cache reads dwarf the rest. */
export const tokenUsageSchema = z.object({
  input: z.number().int(),
  output: z.number().int(),
  cacheRead: z.number().int(),
  cacheWrite: z.number().int(),
});

export type TokenUsage = z.infer<typeof tokenUsageSchema>;

/** Cache reads re-read context already sent and cost a fraction of the rest, so they are left out. */
export function newTokens(usage: TokenUsage): number {
  return usage.input + usage.output + usage.cacheWrite;
}

export function sumTokenUsage(usages: TokenUsage[]): TokenUsage {
  return {
    input: usages.reduce((sum, usage) => sum + usage.input, 0),
    output: usages.reduce((sum, usage) => sum + usage.output, 0),
    cacheRead: usages.reduce((sum, usage) => sum + usage.cacheRead, 0),
    cacheWrite: usages.reduce((sum, usage) => sum + usage.cacheWrite, 0),
  };
}

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

export type PilotRun = z.infer<typeof pilotRunSchema>;
export type PilotRunResultInput = z.infer<typeof pilotRunResultSchema>;
export type ReportPilotUsageInput = z.infer<typeof reportPilotUsageSchema>;
