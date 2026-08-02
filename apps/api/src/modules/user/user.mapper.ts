import { parseAvailability } from "@jobpilot/contracts/user";
import type { Prisma } from "@/generated/prisma/client";

/** The `users` columns behind `portfolioSettingsSchema`. */
export const PORTFOLIO_SETTINGS_SELECT = {
  username: true,
  availability: true,
  showResume: true,
  showWebsite: true,
  showLinkedin: true,
  showGithub: true,
} satisfies Prisma.UserSelect;

type PortfolioSettingsRow = Prisma.UserGetPayload<{ select: typeof PORTFOLIO_SETTINGS_SELECT }>;

/** `availability` is free text in the DB, so it is parsed rather than cast. */
export function toPortfolioSettings(row: PortfolioSettingsRow) {
  return { ...row, availability: parseAvailability(row.availability) };
}
