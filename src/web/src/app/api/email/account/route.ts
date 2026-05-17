import { ok } from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET() {
  const account = await db.emailAccount.findUnique({ where: { id: 1 } });
  if (!account) {
    return ok({ connected: false });
  }
  return ok({
    connected: true,
    provider: account.provider,
    email: account.email,
    lastSyncAt: account.lastSyncAt,
  });
}

export async function DELETE() {
  await db.emailAccount.deleteMany({ where: { id: 1 } });
  return ok({ disconnected: true });
}
