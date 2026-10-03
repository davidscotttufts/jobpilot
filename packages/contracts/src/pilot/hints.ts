import { z } from "zod/v4";

const siteHintSchema = z.object({
  domain: z.string(),
  hint: z.string(),
  seenCount: z.number().int(),
  lastSeenAt: z.date(),
});

export const siteHintListSchema = z.array(siteHintSchema);

export const siteHintsQuerySchema = z.object({ domain: z.string().min(1) });
