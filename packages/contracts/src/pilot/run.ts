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
