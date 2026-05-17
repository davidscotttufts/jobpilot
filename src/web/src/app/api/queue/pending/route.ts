import { getActiveProfileId } from "@/lib/active-profile";
import { ok } from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET() {
  const profileId = await getActiveProfileId();
  const items = await db.queueEntry.findMany({
    where: { profileId, status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  return ok(items);
}
