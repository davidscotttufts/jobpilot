import { hashToken } from "@/common/auth";
import type { PrismaClient } from "@/generated/prisma/client";

/** Revoke a user's active refresh tokens, optionally sparing one raw token.
 *  Returns the PrismaPromise so it composes inside `$transaction`. */
export function revokeRefreshTokens(
  prisma: PrismaClient,
  userId: string,
  exceptRawToken?: string | null,
) {
  return prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptRawToken ? { tokenHash: { not: hashToken(exceptRawToken) } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}
