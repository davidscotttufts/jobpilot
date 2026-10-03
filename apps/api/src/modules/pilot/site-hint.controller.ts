import { siteHintListSchema, siteHintsQuerySchema } from "@jobpilot/contracts/pilot";
import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { RATE_LIMITS, rateLimit } from "@/common/rate-limit";
import { SiteHintService } from "./site-hint.service";

const siteHints = container.resolve(SiteHintService);

export const siteHintsController = new Elysia({
  prefix: "/pilot",
  detail: { tags: ["Pilot"] },
})
  .use(authGuard)
  .get("/site-hints", ({ query }) => siteHints.list(query.domain), {
    query: siteHintsQuerySchema,
    beforeHandle: rateLimit(RATE_LIMITS.pilotRun),
    response: siteHintListSchema,
    detail: {
      summary: "List site hints",
      description:
        "Returns up to 5 hints for a domain (a leading www. is ignored), seen in the last 60 days, most seen first. They are shared advice from all users' runs; the agent may ignore one when the site has changed.",
    },
  });
