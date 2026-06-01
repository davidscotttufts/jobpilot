import { z } from "zod/v4";
import { db } from "@/server/db";
import { runEventSchema } from "@/lib/contracts/run";
import { runChannel } from "@/lib/sse/channels/run";
import { sseResponse, subscribe } from "@/lib/sse/server";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";
import { recordRunEvent } from "@/server/runs/events";

const runParams = z.object({ id: z.string() });

export const GET = api.profileRoute({ params: runParams }, async ({ params, profileId }) => {
  await findOwned(
    (where) => db.run.findFirst({ where, select: { runId: true } }),
    { runId: params.id, profileId },
    "Run",
  );
  return sseResponse(subscribe(runChannel, { runId: params.id }));
});

export const POST = api.profileRoute(
  { params: runParams, body: runEventSchema },
  ({ params, body, profileId }) =>
    recordRunEvent({ runId: params.id, profileId, event: body }),
);
