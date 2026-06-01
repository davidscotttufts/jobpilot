import { db } from "@/server/db";
import type { runEventSchema } from "@/lib/contracts/run";
import { runChannel, type RunEvent } from "@/lib/sse/channels/run";
import { publish } from "@/lib/sse/server";
import { findOwned } from "@/server/api/owned";
import type { z } from "zod/v4";

interface RecordRunEventInput {
  runId: string;
  profileId: number;
  event: z.infer<typeof runEventSchema>;
}

export async function recordRunEvent({ runId, profileId, event }: RecordRunEventInput) {
  await findOwned(
    (where) => db.run.findFirst({ where, select: { runId: true } }),
    { runId, profileId },
    "Run",
  );

  const created = await db.runEvent.create({
    data: { runId, type: event.type, payload: JSON.stringify(event.payload) },
  });
  publish(runChannel, { runId }, {
    type: event.type,
    payload: event.payload,
  } as RunEvent);
  return { id: created.id };
}
