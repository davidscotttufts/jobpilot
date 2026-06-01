import { getActiveProfileId } from "@/lib/active-profile";
import { ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { accountCanSend } from "@/lib/email";

export async function GET() {
  const profileId = await getActiveProfileId();
  const account = await db.emailAccount.findUnique({ where: { profileId } });

  if (!account) {
    return ok({ connected: false, canSend: false });
  }

  return ok({
    connected: true,
    provider: account.provider,
    email: account.email,
    lastSyncAt: account.lastSyncAt,
    canSend: accountCanSend(account),
  });
}

export async function DELETE() {
  const profileId = await getActiveProfileId();
  await db.emailAccount.deleteMany({ where: { profileId } });
  return ok({ disconnected: true });
}
