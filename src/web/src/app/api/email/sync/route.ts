import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/email";
import { publishInboxEvent } from "@/lib/sse/inbox-events";

export async function POST() {
  const account = await db.emailAccount.findUnique({ where: { id: 1 } });
  if (!account) {
    return err(ErrorCodes.NOT_FOUND, "No email account connected", 404);
  }

  const provider = getProvider(account.provider);

  let active = account;
  const now = new Date();
  if (active.refreshToken && active.tokenExpiresAt && active.tokenExpiresAt <= now) {
    try {
      const refreshed = await provider.refresh(active.refreshToken);
      active = await db.emailAccount.update({
        where: { id: 1 },
        data: {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? active.refreshToken,
          tokenExpiresAt: refreshed.expiresAt ?? null,
          scope: refreshed.scope ?? active.scope,
        },
      });
    } catch (e) {
      return err(
        ErrorCodes.UNPROCESSABLE,
        e instanceof Error ? e.message : "Token refresh failed",
        401,
      );
    }
  }

  publishInboxEvent({ type: "sync.started" });

  const result = await provider.syncMessages(active);

  let inserted = 0;
  for (const m of result.newMessages) {
    try {
      await db.emailMessage.create({
        data: {
          accountId: active.id,
          providerId: m.providerId,
          threadId: m.threadId,
          subject: m.subject,
          fromAddress: m.fromAddress,
          fromName: m.fromName,
          fromDomain: m.fromDomain,
          snippet: m.snippet,
          rawBody: m.rawBody,
          receivedAt: m.receivedAt,
        },
      });
      inserted += 1;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") continue;
      throw e;
    }
  }

  await db.emailAccount.update({
    where: { id: 1 },
    data: {
      historyId: result.historyId ?? active.historyId,
      lastSyncAt: new Date(),
    },
  });

  publishInboxEvent({ type: "sync.progress", fetched: result.fetched, new: inserted });

  return ok({ fetched: result.fetched, new: inserted });
}
