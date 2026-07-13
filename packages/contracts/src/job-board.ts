import { z } from "zod/v4";

export const jobBoardSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  searchUrl: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  sortOrder: z.number().int(),
});

/** `domain` identifies the global board, so it is fixed once linked - relink instead of renaming. */
export const jobBoardPatchSchema = jobBoardSchema.omit({ domain: true }).partial();

export type JobBoardInput = z.infer<typeof jobBoardSchema>;
export type JobBoardPatch = z.infer<typeof jobBoardPatchSchema>;
