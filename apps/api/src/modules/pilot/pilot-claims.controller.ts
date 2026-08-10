import {
  acquireBrowserSchema,
  acquiredBrowserSchema,
  createPilotClaimSchema,
  pilotClaimSchema,
  releasePilotClaimSchema,
} from "@jobpilot/contracts/pilot";
import { idParam } from "@jobpilot/contracts/shared";
import { Elysia } from "elysia";
import { container } from "@/common/di";
import { authGuard } from "@/common/middleware";
import { RATE_LIMITS, rateLimit } from "@/common/rate-limit";
import { ClaimService } from "./agenda/claim.service";

const claims = container.resolve(ClaimService);
const limitClaim = rateLimit(RATE_LIMITS.pilotClaim);

export const pilotClaimsController = new Elysia({ prefix: "/pilot", detail: { tags: ["Pilot"] } })
  .use(authGuard)
  .post("/claims", ({ user, body }) => claims.claim(user.id, body.agendaVersion, body.itemId), {
    body: createPilotClaimSchema,
    beforeHandle: limitClaim,
    response: pilotClaimSchema,
    detail: {
      summary: "Claim an agenda item",
      description:
        "Atomically claims an item from the supplied agenda version and creates its 15-minute claim; stale versions and races return 409.",
    },
  })
  .post(
    "/claims/:id/browser",
    ({ user, params, body }) => claims.acquireBrowser(user.id, params.id, body.server),
    {
      params: idParam,
      body: acquireBrowserSchema,
      beforeHandle: limitClaim,
      response: acquiredBrowserSchema,
      detail: {
        summary: "Lease a browser to this claim",
        description:
          "Reserves a named MCP browser server for the life of the claim. A Chrome profile opens in exactly one browser, so a second holder returns 409 - pick another server or wait. The lease is released when the claim is released or expires.",
      },
    },
  )
  .post("/claims/:id/heartbeat", ({ user, params }) => claims.heartbeat(user.id, params.id), {
    params: idParam,
    beforeHandle: limitClaim,
    response: pilotClaimSchema,
    detail: {
      summary: "Heartbeat a claim",
      description: "Extends the claim TTL by 15 minutes and records the heartbeat.",
    },
  })
  .post(
    "/claims/:id/release",
    ({ user, params, body }) => claims.release(user.id, params.id, body),
    {
      params: idParam,
      body: releasePilotClaimSchema,
      beforeHandle: limitClaim,
      response: pilotClaimSchema,
      detail: {
        summary: "Release a claim",
        description:
          "Closes a claim (done/failed/abandoned); abandoned reverts the job to approved. Bookkeeping only - terminal job results go through the campaign result route.",
      },
    },
  );
