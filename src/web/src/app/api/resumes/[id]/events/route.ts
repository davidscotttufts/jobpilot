import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes } from "@/lib/api/response";
import { db } from "@/lib/db";
import { subscribeToResume } from "@/lib/sse";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const resume = await db.resume.findFirst({
    where: { id, profileId },
    select: { id: true },
  });
  if (!resume) {
    return err(ErrorCodes.NOT_FOUND, "Resume not found", 404);
  }

  const stream = subscribeToResume(id);
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
