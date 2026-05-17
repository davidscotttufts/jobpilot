import { getActiveProfileId } from "@/lib/active-profile";
import { ok } from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET() {
  const profileId = await getActiveProfileId();
  const account = await db.emailAccount.findUnique({ where: { profileId } });

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
  const profileId = await getActiveProfileId();
  await db.emailAccount.deleteMany({ where: { profileId } });
  return ok({ disconnected: true });
}
