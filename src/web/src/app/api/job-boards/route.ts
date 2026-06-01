import { db } from "@/server/db";
import { jobBoardSchema } from "@/lib/contracts/job-board";
import { api } from "@/server/api/route";

export const GET = api.profileRoute({}, ({ profileId }) =>
  db.jobBoard.findMany({ where: { profileId }, orderBy: { sortOrder: "asc" } }),
);

export const POST = api.profileRoute({ body: jobBoardSchema }, ({ body, profileId }) =>
  db.jobBoard.create({ data: { ...body, profileId } }),
);
