import {
  type PilotInstructionsConfig,
  pilotInstructionsConfigSchema,
} from "@jobpilot/contracts/pilot";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Read the profile's Pilot instructions (config + free-text goals), defaulting to a full
 * config when no state row exists yet. Kept dependency-free (contracts + Prisma only) so the
 * campaign networking send path can read the cap without importing the pilot services (circular dep).
 */
export async function loadInstructions(
  prisma: Pick<PrismaClient, "pilotState">,
  userId: string,
): Promise<{ config: PilotInstructionsConfig; goals: string }> {
  const state = await prisma.pilotState.findUnique({
    where: { userId },
    select: { instructionsConfig: true, instructionsGoals: true },
  });
  return {
    config: pilotInstructionsConfigSchema.parse(JSON.parse(state?.instructionsConfig ?? "{}")),
    goals: state?.instructionsGoals ?? "",
  };
}
