import { api } from "@/server/api/route";
import { computeAnalyticsStats } from "@/server/analytics/stats";

export const GET = api.route({}, ({ profileId }) => computeAnalyticsStats(profileId));
