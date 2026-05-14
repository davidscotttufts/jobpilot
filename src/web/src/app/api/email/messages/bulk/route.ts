import { err, ErrorCodes, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { bulkActionSchema } from "@/lib/schemas/email";
import { publishInboxEvent } from "@/lib/sse/inbox-events";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bulkActionSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid bulk payload", 422, parsed.error.issues);
  }

  const { ids, action } = parsed.data;
  const status = action === "approve" ? "approved" : "denied";

  await db.emailMessage.updateMany({
    where: { id: { in: ids } },
    data: { reviewStatus: status },
  });

  for (const id of ids) {
    publishInboxEvent({ type: "message.reviewed", id, status });
  }

  return ok({ updated: ids.length, status });
}
