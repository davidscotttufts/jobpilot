import { z } from "zod/v4";
import { conflict } from "@/common/errors";
import { toInputJson } from "@/common/json";
import type { Prisma } from "@/generated/prisma/client";

export type BrowserLeaseWriter = Pick<Prisma.TransactionClient, "pilotClaim">;

/** The key the server name is stored under on a claim's payload. */
export const BROWSER_SERVER_KEY = "browserServer";

const payloadSchema = z.record(z.string(), z.json());

/**
 * Leases one browser to one claim, because a Chrome profile opens in exactly one browser.
 *
 * Eight of nineteen recorded apply failures were a locked Playwright profile - two consumers
 * reaching for the same one, each terminating the whole apply. Concurrency made that worse rather
 * than better: raising `maxConcurrentApplies` without arbitration just adds contenders.
 *
 * The lease rides on the claim rather than a table of its own. A browser is in use exactly while
 * an open claim names it, so the existing machinery already does the hard parts - a crashed worker
 * has its claim expired by the sweep, which frees the browser with it, and the 25-minute lifetime
 * ceiling bounds how long a wedged worker can hold one. A separate table would need its own sweep
 * and could disagree with the claims about who is running.
 */
export async function acquireBrowser(
  db: BrowserLeaseWriter,
  userId: string,
  claimId: string,
  server: string,
  now: Date,
): Promise<{ server: string }> {
  const claim = await db.pilotClaim.findFirst({
    where: { id: claimId, userId, releasedAt: null },
    select: { id: true, payload: true },
  });
  if (!claim) {
    throw conflict("Claim is not open; acquire a browser only while holding the claim.");
  }

  const holders = await db.pilotClaim.findMany({
    where: { userId, releasedAt: null, expiresAt: { gt: now }, id: { not: claimId } },
    select: { id: true, payload: true },
  });
  const taken = holders.find((other) => readServer(other.payload) === server);
  if (taken) {
    throw conflict(
      `Browser "${server}" is held by another running item. Use a different server or wait for it to finish.`,
    );
  }

  const payload = payloadSchema.parse(claim.payload);
  await db.pilotClaim.update({
    where: { id: claimId },
    data: { payload: toInputJson({ ...payload, [BROWSER_SERVER_KEY]: server }) },
  });
  return { server };
}

/** Server names currently held by open, unexpired claims. */
export async function browsersInUse(
  db: BrowserLeaseWriter,
  userId: string,
  now: Date,
): Promise<string[]> {
  const open = await db.pilotClaim.findMany({
    where: { userId, releasedAt: null, expiresAt: { gt: now } },
    select: { payload: true },
  });
  const names = open
    .map((claim) => readServer(claim.payload))
    .filter((n): n is string => n !== null);
  return [...new Set(names)].sort();
}

function readServer(payload: unknown): string | null {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  const value = parsed.data[BROWSER_SERVER_KEY];
  return typeof value === "string" && value.length > 0 ? value : null;
}
