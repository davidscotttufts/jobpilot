import { db } from "@/server/db";
import { api } from "@/server/api/route";

export const GET = api.profileRoute({}, ({ profileId }) =>
  db.queueEntry.findMany({
    where: { profileId, status: "pending" },
    orderBy: { createdAt: "asc" },
  }),
);
