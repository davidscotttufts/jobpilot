import { z } from "zod/v4";

/** API liveness status - the running application version and current server time. */
export const healthStatusSchema = z.object({
  version: z.string(),
  time: z.date(),
});
