import { z } from "zod/v4";

export const healthStatusSchema = z.object({
  version: z.string(),
  time: z.date(),
});
