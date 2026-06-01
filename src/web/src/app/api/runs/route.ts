import { z } from "zod/v4";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { reconcileStaleRuns } from "@/server/runs/reconcile";
import { createRunSchema } from "@/lib/contracts/run";
import { api } from "@/server/api/route";

const runsQuery = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
});

export const GET = api.profileRoute({ query: runsQuery }, async ({ query, profileId }) => {
  await reconcileStaleRuns(profileId);

  const where: Prisma.RunWhereInput = { profileId };

  if (query.status) where.status = query.status;
  if (query.source) where.source = query.source;

  const runs = await db.run.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: 200,
  });

  return runs.map((r) => ({
    ...r,
    config: JSON.parse(r.config) as Record<string, unknown>,
    summary: JSON.parse(r.summary) as Record<string, unknown>,
  }));
});

export const POST = api.profileRoute(
  { body: createRunSchema },
  ({ body, profileId }) =>
    db.run.create({
      data: {
        runId: body.runId,
        profileId,
        query: body.query,
        source: body.source,
        config: JSON.stringify(body.config ?? {}),
      },
    }),
);
