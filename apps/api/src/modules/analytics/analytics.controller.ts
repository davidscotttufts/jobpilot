import { Elysia } from "elysia";
import { container } from "@/common/di";
import { authGuard } from "@/common/middleware";
import {
  analyticsOutcomesSchema,
  analyticsStatsSchema,
  analyticsThresholdSchema,
} from "./analytics.schema";
import { AnalyticsService } from "./analytics.service";

const analyticsService = container.resolve(AnalyticsService);

export const analyticsController = new Elysia({
  prefix: "/analytics",
  detail: { tags: ["Analytics"] },
})
  .use(authGuard)
  .get("/", ({ user }) => analyticsService.stats(user.id), {
    response: analyticsStatsSchema,
    detail: {
      summary: "Get dashboard analytics summary",
      description:
        "Aggregates the active profile's application and networking activity into a single dashboard summary, returning totals, this-week counts, response and reply rates, stage breakdown, 30-day per-day timelines, and top boards, reject reasons, and contact sources.",
    },
  })
  .get("/outcomes", ({ user }) => analyticsService.outcomes(user.id), {
    response: analyticsOutcomesSchema,
    detail: {
      summary: "Get conversion by board, score band and title",
      description:
        "Breaks applications into slices and reports how each fared: advanced, rejected, or still unanswered. Rates are withheld below a sample floor, and a flag marks the case where nothing has advanced yet - every rate is then a rejection rate, which reads backwards if taken for conversion.",
    },
  })
  .get("/score-threshold", ({ user }) => analyticsService.scoreThreshold(user.id), {
    response: analyticsThresholdSchema,
    detail: {
      summary: "Simulate a lower match-score threshold",
      description:
        "Reports how many jobs each lower threshold would have admitted, with the highest-scoring examples and their match reasons. Counts only jobs skipped for scoring too low - a lower bar would not admit a clearance or CAPTCHA skip.",
    },
  });
