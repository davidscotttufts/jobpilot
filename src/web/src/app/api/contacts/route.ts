import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { createContactPayload } from "@/lib/outreach/contact";
import { createContactSchema } from "@/lib/schemas/outreach";

/** List the active profile's contacts (newest first) for the networking page. */
export async function GET() {
  const profileId = await getActiveProfileId();
  const contacts = await db.contact.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
  });
  return ok(contacts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid contact payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const c = parsed.data;
  const contact = await db.contact.create({
    data: {
      profileId,
      ...createContactPayload(c),
      // Contacts added here are hand-entered unless the payload says otherwise.
      discoverySource: c.discoverySource ?? "manual",
    },
  });
  return ok(contact, { status: 201 });
}
