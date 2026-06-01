import { z } from "zod/v4";
import { outreachMessageResultSchema } from "@/lib/contracts/outreach";
import { api } from "@/server/api/route";
import { recordOutreachResult } from "@/server/runs/outreach-result";

const params = z.object({
  id: z.string(),
  messageId: z.coerce.number().int().positive(),
});

export const POST = api.profileRoute(
  { params, body: outreachMessageResultSchema },
  ({ params, body, profileId }) =>
    recordOutreachResult({ runId: params.id, messageId: params.messageId, profileId, data: body }),
);
