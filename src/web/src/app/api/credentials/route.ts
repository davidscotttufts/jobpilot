import { db } from "@/server/db";
import { credentialSchema } from "@/lib/contracts/credential";
import { api } from "@/server/api/route";

export const GET = api.profileRoute({}, ({ profileId }) =>
  db.credential.findMany({ where: { profileId }, orderBy: { scope: "asc" } }),
);

export const POST = api.profileRoute({ body: credentialSchema }, ({ body, profileId }) =>
  db.credential.create({ data: { ...body, profileId } }),
);
