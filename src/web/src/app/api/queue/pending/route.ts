import { ok } from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.queueEntry.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  return ok(items);
}
