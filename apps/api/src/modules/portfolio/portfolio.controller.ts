import { Elysia } from "elysia";
import { z } from "zod/v4";
import { container } from "@/common/di";
import { RATE_LIMITS, rateLimit } from "@/common/rate-limit";
import {
  leaderboardQuerySchema,
  leaderboardResponseSchema,
  portfolioSchema,
  portfolioSitemapSchema,
} from "./portfolio.schema";
import { PortfolioService } from "./portfolio.service";

const svc = container.resolve(PortfolioService);

/** Deliberately unguarded (auth is opt-in): this backs the crawlable public /u/[username] pages. */
export const publicPortfolioController = new Elysia({
  prefix: "/public/portfolio",
  detail: { tags: ["Portfolio"] },
})
  // Scoped once, so a route added later cannot forget it.
  .guard({ beforeHandle: rateLimit(RATE_LIMITS.publicPortfolio) })
  // Literal routes declared before /:username so they win the match.
  .get("/leaderboard", ({ query }) => svc.leaderboard(query.window), {
    query: leaderboardQuerySchema,
    response: leaderboardResponseSchema,
    detail: {
      summary: "Trending users leaderboard",
      description:
        "Returns published portfolios ranked by activity (applications + networking messages) over the requested window (week/month/all). Unauthenticated.",
    },
  })
  .get("/sitemap", () => svc.sitemap(), {
    response: portfolioSitemapSchema,
    detail: {
      summary: "Portfolio sitemap feed",
      description:
        "Returns the username and last-updated date of every published portfolio, capped at 5000, for the web app's sitemap.xml.",
    },
  })
  .get("/:username", ({ params }) => svc.byUsername(params.username), {
    params: z.object({ username: z.string().min(1) }),
    response: portfolioSchema,
    detail: {
      summary: "Get a public portfolio",
      description:
        "Returns one published portfolio by username, built from the active resume plus aggregated activity. 404 when the username is unknown or the portfolio is unpublished. Unauthenticated.",
    },
  });
