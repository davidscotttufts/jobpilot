import { z } from "zod/v4";
import { db } from "@/server/db";
import { addRunJobSchema } from "@/lib/contracts/run";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { runChannel } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";

const runParams = z.object({ id: z.string() });

export const GET = api.profileRoute({ params: runParams }, ({ params, profileId }) =>
  db.job.findMany({
    where: { runId: params.id, run: { profileId } },
    orderBy: { id: "asc" },
  }),
);

export const POST = api.profileRoute(
  { params: runParams, body: addRunJobSchema },
  async ({ params, body, profileId }) => {
    const { id } = params;
    await findOwned(
      (where) => db.run.findFirst({ where, select: { runId: true } }),
      { runId: id, profileId },
      "Run",
    );

    const job = await db.job.create({
      data: {
        runId: id,
        key: body.key,
        title: body.title,
        company: body.company,
        location: body.location ?? null,
        salary: body.salary ?? null,
        type: body.type ?? null,
        url: body.url,
        board: body.board ?? null,
        matchScore: body.matchScore ?? null,
        matchReason: body.matchReason ?? null,
        status: body.status ?? "pending",
        description: body.description ?? null,
        digest: body.digest ?? null,
      },
    });

    await db.queueEntry.updateMany({
      where: { profileId, url: job.url, status: "pending" },
      data: { status: "consumed", consumedAt: new Date() },
    });

    publish(
      runChannel,
      { runId: id },
      {
        type: "job-update",
        payload: { kind: "added", job },
      },
    );
    publish(
      pipelineChannel,
      { profileId },
      {
        type: "runjob.created",
        runId: id,
        key: job.key,
      },
    );

    return job;
  },
);
