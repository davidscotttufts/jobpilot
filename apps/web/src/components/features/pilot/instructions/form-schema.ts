import {
  PILOT_EMAIL_AUTONOMY,
  PILOT_LINKEDIN_AUTONOMY,
  pilotNetworkingSchema,
} from "@jobpilot/contracts/pilot";
import { z } from "zod/v4";

export const instructionsFormSchema = z.object({
  goals: z.string().trim().min(1, "Required"),
  dailyApplyCap: z.number().int().min(0),
  minScore: z.number().min(0).max(100),
  checkIntervalMinutes: z.number().int().min(5),
  // Mirrors the config block so the section addresses its fields by their real path. Spelled out
  // rather than reusing pilotNetworkingSchema, whose defaults make every key optional on input.
  networking: z.object({
    email: z.enum(PILOT_EMAIL_AUTONOMY),
    linkedIn: z.enum(PILOT_LINKEDIN_AUTONOMY),
    dailyCap: z.number().int().min(0),
    followupDays: z.number().int().min(0),
  }),
  boards: z.array(z.string()),
  promotionPlatforms: z.array(
    z.object({
      platform: z.string().min(1, "Required"),
      target: z.string(),
      postEveryDays: z.number().min(1),
    }),
  ),
});

export type InstructionsFormValues = z.infer<typeof instructionsFormSchema>;

/** Shared `defaultValues` the withForm sections type against; real values come from pilot state. */
export const INSTRUCTIONS_FORM_DEFAULTS: InstructionsFormValues = {
  goals: "",
  dailyApplyCap: 10,
  minScore: 60,
  checkIntervalMinutes: 30,
  networking: pilotNetworkingSchema.parse({}),
  boards: [],
  promotionPlatforms: [],
};
