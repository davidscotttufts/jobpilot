import { z } from "zod/v4";

export const answerKeySchema = z.string().regex(/^[a-z0-9_]{1,64}$/);

export const profileAnswerSchema = z.object({
  key: answerKeySchema,
  value: z.string(),
  updatedAt: z.date(),
});

export const profileAnswerListSchema = z.array(profileAnswerSchema);

export const saveProfileAnswerSchema = z.object({ value: z.string().trim().min(1) });

export const profileAnswerKeyParamSchema = z.object({ key: answerKeySchema });
