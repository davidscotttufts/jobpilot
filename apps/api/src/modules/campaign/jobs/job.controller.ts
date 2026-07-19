import {
  addCampaignJobSchema,
  campaignJobResultSchema,
  patchCampaignJobSchema,
} from "@jobpilot/contracts/campaign";
import { Elysia } from "elysia";
import { container } from "@/common/di";
import { authGuard } from "@/common/middleware";
import { campaignJobParams, campaignJobSchema, campaignParams } from "../campaign.schema";
import { campaignJobListSchema, campaignJobResultResponseSchema } from "./job.schema";
import { CampaignJobService } from "./job.service";

const svc = container.resolve(CampaignJobService);

export const campaignJobController = new Elysia({
  name: "campaign-jobs",
  detail: { tags: ["Campaigns"] },
})
  .use(authGuard)
  .get("/:id/jobs", ({ user, params }) => svc.listJobs(user.id, params.id), {
    params: campaignParams,
    response: campaignJobListSchema,
    detail: {
      summary: "List campaign jobs",
      description: "Returns all queued jobs for the owned campaign, ordered by creation.",
    },
  })
  .post("/:id/jobs", ({ user, params, body }) => svc.addJob(user.id, params.id, body), {
    params: campaignParams,
    body: addCampaignJobSchema,
    response: campaignJobSchema,
    detail: {
      summary: "Add campaign job",
      description:
        "Adds a discovered job to the campaign, consumes its matching pending queue entry, emits SSE updates, and returns the created job.",
    },
  })
  .patch(
    "/:id/jobs/:key",
    ({ user, params, body }) => svc.patchJob(user.id, params.id, params.key, body),
    {
      params: campaignJobParams,
      body: patchCampaignJobSchema,
      response: campaignJobSchema,
      detail: {
        summary: "Update campaign job",
        description:
          "Applies a non-terminal update to a campaign job (e.g. status, match data, notes), recomputes the summary on status changes, emits SSE updates, and returns the updated job.",
      },
    },
  )
  .post(
    "/:id/jobs/:key/result",
    ({ user, params, body }) => svc.recordJobResult(user.id, params.id, params.key, body),
    {
      params: campaignJobParams,
      body: campaignJobResultSchema,
      response: campaignJobResultResponseSchema,
      detail: {
        summary: "Record campaign job result",
        description:
          "Records a job's terminal outcome (applied/failed/skipped), upserts the Application row when applied, marks the queue entry, recomputes the summary, and returns the job, application, and summary.",
      },
    },
  );
