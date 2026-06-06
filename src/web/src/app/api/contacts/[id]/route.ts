import { patchContactSchema } from "@/api/contracts/outreach";
import { idParam } from "@/api/contracts/shared";
import { notFound } from "@/server/api/errors";
import { findOwned } from "@/server/api/owned";
import { api } from "@/server/api/route";
import { db } from "@/server/db";

export const GET = api.route({ params: idParam }, ({ params, profileId }) =>
  findOwned(
    (where) =>
      db.contact.findFirst({
        where,
        include: { messages: { orderBy: { id: "asc" } } },
      }),
    { id: params.id, profileId },
    "Contact",
  ),
);

export const PATCH = api.route(
  { params: idParam, body: patchContactSchema },
  async ({ params, body, profileId }) => {
    await findOwned(
      (where) => db.contact.findFirst({ where, select: { id: true } }),
      { id: params.id, profileId },
      "Contact",
    );
    return db.contact.update({ where: { id: params.id }, data: body });
  },
);

export const DELETE = api.route({ params: idParam }, async ({ params, profileId }) => {
  const d = await db.contact.deleteMany({ where: { id: params.id, profileId } });
  if (d.count === 0) {
    throw notFound("Contact not found");
  }
  return { deleted: true };
});
