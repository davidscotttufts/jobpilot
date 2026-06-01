import { z } from "zod/v4";
import { patchRunJobSchema } from "@/lib/contracts/run";
import { api } from "@/server/api/route";
import { patchRunJob } from "@/server/runs/job-patch";

const runJobParams = z.object({ id: z.string(), key: z.string() });

export const PATCH = api.profileRoute(
  { params: runJobParams, body: patchRunJobSchema },
  ({ params, body, profileId }) =>
    patchRunJob({ runId: params.id, key: params.key, profileId, patch: body }),
);
