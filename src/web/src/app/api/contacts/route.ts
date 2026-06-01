import { createContactSchema } from "@/lib/contracts/outreach";
import { api } from "@/server/api/route";
import { db } from "@/server/db";
import { createContactPayload } from "@/server/outreach/contact";

/** List the active profile's contacts (newest first) for the networking page. */
export const GET = api.route({}, ({ profileId }) =>
  db.contact.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } }),
);

export const POST = api.route({ body: createContactSchema }, ({ body, profileId }) =>
  db.contact.create({
    data: {
      profileId,
      ...createContactPayload(body),
      // Contacts added here are hand-entered unless the payload says otherwise.
      discoverySource: body.discoverySource ?? "manual",
    },
  }),
);
