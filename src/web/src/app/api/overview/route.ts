import { api } from "@/server/api/route";
import { computeOverviewStats } from "@/server/overview/stats";

export const GET = api.route({}, ({ profileId }) => computeOverviewStats(profileId));
