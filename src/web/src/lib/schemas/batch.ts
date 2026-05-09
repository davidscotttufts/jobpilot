import { z } from "zod/v4";

export const BATCH_STATUSES = ["pending", "consumed", "skipped"] as const;
export const batchStatusSchema = z.enum(BATCH_STATUSES);

export const addBatchSchema = z.object({
  urls: z.array(z.url()).min(1),
  note: z.string().optional().nullable(),
});

export const patchBatchSchema = z.object({
  status: batchStatusSchema,
});

export type BatchStatus = z.infer<typeof batchStatusSchema>;
export type AddBatchInput = z.infer<typeof addBatchSchema>;
export type PatchBatchInput = z.infer<typeof patchBatchSchema>;
