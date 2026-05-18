import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { loadApplying, loadInterviewing, loadQueued, loadSubmitted } from "./_lib/loaders";
import { parsePipelineQuery } from "./_lib/params";

export async function GET(req: Request) {
  const query = parsePipelineQuery(req);
  if (!query) {
    return err(ErrorCodes.INVALID_REQUEST, "Invalid or missing 'stage' parameter", 400);
  }

  const profileId = await getActiveProfileId();
  const { stage, cursor, limit, filters } = query;

  switch (stage) {
    case "queued":
      return ok(await loadQueued(profileId, cursor, limit, filters));
    case "applying":
      return ok(await loadApplying(profileId, cursor, limit, filters));
    case "submitted":
      return ok(await loadSubmitted(profileId, cursor, limit, filters));
    case "interviewing":
      return ok(await loadInterviewing(profileId, cursor, limit, filters));
  }
}
