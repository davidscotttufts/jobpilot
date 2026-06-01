import { z } from "zod/v4";
import { runJobResultSchema } from "@/lib/contracts/run";
import { api } from "@/server/api/route";
import { recordJobResult } from "@/server/runs/job-result";

const params = z.object({ id: z.string(), key: z.string() });

export const POST = api.profileRoute({ params, body: runJobResultSchema }, ({ params, body, profileId }) =>
  recordJobResult({ runId: params.id, key: params.key, profileId, data: body }),
);
