import { PILOT_EMAIL_AUTONOMY, PILOT_LINKEDIN_AUTONOMY } from "@jobpilot/contracts/pilot";
import { z } from "zod/v4";

export const instructionsFormSchema = z.object({
  goals: z.string().trim().min(1, "Required"),
  dailyApplyCap: z.number().int().min(0),
  dailyNetworkingCap: z.number().int().min(0),
  networkingFollowupDays: z.number().int().min(0),
  minScore: z.number().min(0).max(100),
  checkIntervalMinutes: z.number().int().min(5),
  networkingEmail: z.enum(PILOT_EMAIL_AUTONOMY),
  networkingLinkedIn: z.enum(PILOT_LINKEDIN_AUTONOMY),
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
  dailyNetworkingCap: 5,
  networkingFollowupDays: 5,
  minScore: 60,
  checkIntervalMinutes: 30,
  networkingEmail: "off",
  networkingLinkedIn: "off",
  boards: [],
  promotionPlatforms: [],
};
