import { z } from "zod/v4";
import { fitProfileSchema, jobDigestSchema } from "@/server/scoring/fit";
import { scoreJobFit } from "@/server/scoring/profile-fit";
import { api } from "@/server/api/route";

const requestSchema = z.object({
  digest: jobDigestSchema,
  profile: fitProfileSchema.partial().optional(),
});

export const POST = api.profileRoute({ body: requestSchema }, ({ body, profileId }) =>
  scoreJobFit({ profileId, digest: body.digest, profile: body.profile }),
);
