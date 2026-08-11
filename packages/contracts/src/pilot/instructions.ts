import { z } from "zod/v4";
import {
  NETWORKING_AUTONOMY,
  type NetworkingAutonomy,
  type NetworkingChannel,
  type NetworkingMode,
} from "../networking";

/** The campaign modes plus "off". LinkedIn drops "auto": nothing auto-sends there. */
export const PILOT_EMAIL_AUTONOMY = ["off", ...NETWORKING_AUTONOMY] as const;
export const PILOT_LINKEDIN_AUTONOMY = ["off", "draft", "review"] as const;

// Every channel "off" is how networking is switched off; there is no separate master flag.
export const pilotNetworkingSchema = z.object({
  email: z.enum(PILOT_EMAIL_AUTONOMY).default("off"),
  linkedIn: z.enum(PILOT_LINKEDIN_AUTONOMY).default("off"),
  dailyCap: z.number().int().min(0).default(5),
  followupDays: z.number().int().min(0).default(5),
});

const pilotPromotionPlatformSchema = z.object({
  platform: z.string().min(1),
  target: z.string().optional(),
  postEveryDays: z.number().int().min(1).default(30),
});

/** Self-promotion config. Review-only in M3: auto-posting is deliberately not offered. */
const pilotPromotionConfigSchema = z.object({
  platforms: z.array(pilotPromotionPlatformSchema).default([]),
  autonomy: z.literal("review").default("review"),
});

/**
 * The Pilot's operating envelope, stored as JSON in `PilotState.instructionsConfig`.
 * Every field defaults, so an empty `{}` parses to a full, usable config.
 */
export const pilotInstructionsConfigSchema = z.object({
  dailyApplyCap: z.number().int().min(0).default(10),
  /**
   * How many applies may be in flight at once. Defaults to 1 - the serial loop the pilot has
   * always run. Raising it is the only lever with a large throughput multiple in it, since one
   * application is model- and page-bound at ~5 min and will not itself get much faster. Each
   * concurrent worker needs its own browser profile, and parallel submissions from one identity
   * are a stronger bot-detection signal than a serial trickle, so raise it a step at a time.
   * Bounded by MAX_OPEN_APPLY_CLAIMS, past which the stale sweep stops protecting live jobs.
   */
  maxConcurrentApplies: z.number().int().min(1).max(20).default(1),
  /**
   * Hold the first N applications for approval before they are submitted.
   *
   * The scariest moment in an autonomous applier is the first one that goes out unseen, and the
   * worker already supports `preSubmitReview` - nothing ever set it. Defaults to 1: see one
   * complete application, with its tailored resume and cover letter, before trusting the rest.
   * 0 turns it off.
   */
  reviewFirstApplies: z.number().int().min(0).max(50).default(1),
  minScore: z.number().min(0).max(100).default(60),
  boards: z.array(z.string()).default([]),
  checkIntervalMinutes: z.number().int().min(5).default(30),
  // `prefault`, not `default`: a missing key is parsed as `{}` so every nested field defaults too.
  networking: pilotNetworkingSchema.prefault({}),
  promotion: pilotPromotionConfigSchema.prefault({}),
});

export const updatePilotInstructionsSchema = z.object({
  // Goals are mandatory and the pilot's whole steering input: an empty save is rejected.
  goals: z.string().trim().min(1, "Write the pilot's goals before saving."),
  config: pilotInstructionsConfigSchema,
});

export const pilotStateSchema = z.object({
  userId: z.uuid(),
  running: z.boolean(),
  instructionsGoals: z.string(),
  instructionsConfig: pilotInstructionsConfigSchema,
  instructionsUpdatedAt: z.date().nullable(),
  lastCycleAt: z.date().nullable(),
  cycleCount: z.number().int(),
  // Today's applied count (tz-aware) and whether it has reached the instructions' daily cap.
  appliedToday: z.number().int(),
  capReached: z.boolean(),
  networkingSentToday: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PilotInstructionsConfig = z.infer<typeof pilotInstructionsConfigSchema>;
export type UpdatePilotInstructionsInput = z.infer<typeof updatePilotInstructionsSchema>;
export type PilotState = z.infer<typeof pilotStateSchema>;

/** How one channel runs, or null when it is off. */
export function channelAutonomy(
  config: PilotInstructionsConfig,
  channel: NetworkingChannel,
): NetworkingAutonomy | null {
  const mode = channel === "email" ? config.networking.email : config.networking.linkedIn;
  return mode === "off" ? null : mode;
}

// Which channel a warm intro prefers when both are on
const CHANNEL_PREFERENCE = ["email", "linkedin"] as const satisfies readonly NetworkingChannel[];

/** How a new outreach message goes out, or null when every channel is off. */
export function networkingMode(config: PilotInstructionsConfig): NetworkingMode | null {
  for (const channel of CHANNEL_PREFERENCE) {
    const autonomy = channelAutonomy(config, channel);
    if (autonomy) return { channel, autonomy };
  }
  return null;
}
