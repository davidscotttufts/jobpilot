import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { RATE_LIMITS, rateLimit } from "@/common/rate-limit";
import { publicStatsSchema } from "./stats.schema";
import { StatsService } from "./stats.service";

const svc = container.resolve(StatsService);

export const publicStatsController = new Elysia({
  prefix: "/public/stats",
  detail: { tags: ["Stats"] },
})
  .guard({ beforeHandle: rateLimit(RATE_LIMITS.publicStats) })
  .get("/", () => svc.publicStats(), {
    response: publicStatsSchema,
    detail: {
      summary: "Site-wide totals",
      description:
        "Published job listings, plus applications sent and people active (applied or messaged) across all users over the last 30 days. Cached for five minutes. Unauthenticated.",
    },
  });
