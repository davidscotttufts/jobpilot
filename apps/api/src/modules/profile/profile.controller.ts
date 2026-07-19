import {
  portfolioSettingsPatchSchema,
  profileWithAutoApplySchema,
  setPrimaryResumeSchema,
  usernameSchema,
} from "@jobpilot/contracts/profile";
import { Elysia } from "elysia";
import { z } from "zod/v4";
import { container } from "@/common/di";
import { authGuard } from "@/common/middleware";
import { portfolioSchema } from "@/modules/portfolio/portfolio.schema";
import { PortfolioService } from "@/modules/portfolio/portfolio.service";
import { idResponseSchema } from "@/types/response";
import {
  portfolioSettingsSchema,
  primaryResumeSetSchema,
  profileAggregateSchema,
  usernameAvailabilitySchema,
} from "./profile.schema";
import { ProfileService } from "./profile.service";

const svc = container.resolve(ProfileService);
const portfolioSvc = container.resolve(PortfolioService);

export const profileController = new Elysia({
  prefix: "/profile",
  detail: { tags: ["Profile"] },
})
  .use(authGuard)
  .get("/", ({ user }) => svc.get(user.id), {
    response: profileAggregateSchema,
    detail: {
      summary: "Get active profile",
      description:
        "Returns the active profile aggregate, including its auto-apply settings, references, and resumes.",
    },
  })
  .put("/", ({ user, body }) => svc.update(user.id, body), {
    body: profileWithAutoApplySchema,
    response: idResponseSchema,
    detail: {
      summary: "Replace active profile",
      description:
        "Performs a full replace of the active profile and its auto-apply settings, returning the updated profile aggregate.",
    },
  })
  .put("/primary-resume", ({ user, body }) => svc.setPrimaryResume(user.id, body.resumeId), {
    body: setPrimaryResumeSchema,
    response: primaryResumeSetSchema,
    detail: {
      summary: "Set primary resume",
      description:
        "Marks one of the profile's resumes as primary (or clears it with `null`), returning the new primary resume id.",
    },
  })
  .get("/portfolio", ({ user }) => svc.getPortfolioSettings(user.id), {
    response: portfolioSettingsSchema,
    detail: {
      summary: "Get public-portfolio settings",
      description: "Returns the user's portfolio username, publish flag, and availability status.",
    },
  })
  .get("/portfolio/preview", ({ user }) => portfolioSvc.previewByUserId(user.id), {
    response: portfolioSchema,
    detail: {
      summary: "Preview own portfolio",
      description:
        "Renders the owner's portfolio card exactly as visitors would see it, regardless of publish state - backs the settings live preview.",
    },
  })
  .get("/portfolio/available", ({ user, query }) => svc.checkUsername(user.id, query.username), {
    query: z.object({ username: usernameSchema }),
    response: usernameAvailabilitySchema,
    detail: {
      summary: "Check username availability",
      description:
        "Whether the given username is free for this user to claim (own current one counts as free).",
    },
  })
  .patch("/portfolio", ({ user, body }) => svc.updatePortfolioSettings(user.id, body), {
    body: portfolioSettingsPatchSchema,
    response: portfolioSettingsSchema,
    detail: {
      summary: "Update public-portfolio settings",
      description:
        "Sets/changes the portfolio username (409 if taken), toggles publishing, and sets the availability status.",
    },
  });
