import { type Cookie, Elysia } from "elysia";
import { type AuthUser, readSessionCookie } from "@/common/auth";
import { container } from "@/common/di/container";
import { unauthorized } from "@/common/errors";
import { AuthTokenService } from "@/modules/auth/auth-token.service";

interface AuthContext {
  headers: Record<string, string | undefined>;
  cookie: Record<string, Cookie<unknown> | undefined>;
}

/**
 * Resolve the principal from a request: `Authorization: Bearer` (the agent's terminal token), then
 * the httpOnly `session` cookie. Returns null when unauthenticated.
 */
export async function resolveAuthUser({ headers, cookie }: AuthContext): Promise<AuthUser | null> {
  const authorization = headers.authorization;
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const token = bearer ?? readSessionCookie(cookie);
  if (!token) {
    return null;
  }
  // Resolved per call, not at import, so a test can bind a fake before the first request.
  return container.get(AuthTokenService).verify(token);
}

/** Derives `user`. Throws 401 when unauthenticated. */
export const authGuard = new Elysia({ name: "auth-guard" }).derive(
  { as: "scoped" },
  async ({ headers, cookie }): Promise<{ user: AuthUser }> => {
    const user = await resolveAuthUser({ headers, cookie });
    if (!user) {
      throw unauthorized("Missing authorization");
    }
    return { user };
  },
);
