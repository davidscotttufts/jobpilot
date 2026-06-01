import { db } from "@/server/db";
import { idParam } from "@/lib/contracts/shared";
import { resumeChannel } from "@/lib/sse/channels/resume";
import { sseResponse, subscribe } from "@/lib/sse/server";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";

export const GET = api.profileRoute({ params: idParam }, async ({ params, profileId }) => {
  await findOwned(
    (where) => db.resume.findFirst({ where, select: { id: true } }),
    { id: params.id, profileId },
    "Resume",
  );
  return sseResponse(subscribe(resumeChannel, { resumeId: params.id }));
});
