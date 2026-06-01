import { idParam } from "@/lib/contracts/shared";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";
import { db } from "@/server/db";

export const GET = api.profileRoute({ params: idParam }, ({ params, profileId }) =>
  findOwned(
    (where) =>
      db.application.findFirst({
        where,
        include: {
          stageEvents: { orderBy: { occurredAt: "asc" } },
        },
      }),
    { id: params.id, profileId },
    "Application",
  ),
);

export const DELETE = api.profileRoute({ params: idParam }, async ({ params, profileId }) => {
  await findOwned(
    (where) => db.application.findFirst({ where, select: { id: true } }),
    { id: params.id, profileId },
    "Application",
  );
  await db.application.delete({ where: { id: params.id } });
  return { deleted: params.id };
});
