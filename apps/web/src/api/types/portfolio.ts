import type { Data } from "@jobpilot/api-client";
import type { api } from "@/api/client";

/** One public portfolio, from `GET /api/public/portfolio/:username`. */
export type PortfolioDto = Data<ReturnType<typeof api.public.portfolio>["get"]>;
export type PortfolioDayPoint = PortfolioDto["perDay"][number];
export type PortfolioStats = PortfolioDto["stats"];

/** The trending leaderboard, from `GET /api/public/portfolio/leaderboard`. */
export type LeaderboardDto = Data<typeof api.public.portfolio.leaderboard.get>;
export type LeaderboardRow = LeaderboardDto["rows"][number];
export type LeaderboardWindow = NonNullable<LeaderboardDto["window"]>;

/** The user's own portfolio settings, from `GET /api/profile/portfolio`. */
export type PortfolioSettingsDto = Data<typeof api.profile.portfolio.get>;
