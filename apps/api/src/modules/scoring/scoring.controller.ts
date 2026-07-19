import { Elysia } from "elysia";
import { container } from "@/common/di";
import { authGuard } from "@/common/middleware";
import { fitResultSchema, scoreFitSchema } from "./scoring.schema";
import { ScoringService } from "./scoring.service";

const scoringService = container.resolve(ScoringService);

export const scoringController = new Elysia({
  prefix: "/score-fit",
  detail: { tags: ["Scoring"] },
})
  .use(authGuard)
  .post("/", ({ user, body }) => scoringService.scoreJobFit(user.id, body), {
    body: scoreFitSchema,
    response: fitResultSchema,
    detail: {
      summary: "Score job fit",
      description:
        "Deterministically scores a job digest against the active profile's resume-derived inputs plus any provided overrides and returns the computed fit result.",
    },
  });
