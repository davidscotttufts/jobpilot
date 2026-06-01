import { api } from "@/server/api/route";
import { computeOverviewStats } from "@/server/overview/stats";

export const GET = api.profileRoute({}, ({ profileId }) => computeOverviewStats(profileId));
