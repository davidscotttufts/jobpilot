import type { Cookie } from "elysia";
import { env } from "@/env";

type CookieJar = Record<string, Cookie<unknown>>;

const isProduction = env.NODE_ENV === "production";
const SESSION_COOKIE = "session";
const sessionOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
} as const;

/** The raw session token from the httpOnly cookie, if any. */
export function readSessionCookie(
  cookie: Record<string, Cookie<unknown> | undefined>,
): string | undefined {
  const value = cookie[SESSION_COOKIE]?.value;
  return typeof value === "string" && value ? value : undefined;
}

export function setSessionCookie(cookie: CookieJar, token: string): void {
  cookie[SESSION_COOKIE]!.set({
    ...sessionOptions,
    maxAge: env.SESSION_TTL_DAYS * 86_400,
    value: token,
  });
}

export function clearSessionCookie(cookie: CookieJar): void {
  cookie[SESSION_COOKIE]!.set({ ...sessionOptions, maxAge: 0, value: "" });
}

/**
 * The short-lived httpOnly cookies backing an OAuth redirect flow: the CSRF state, plus an optional
 * companion value (the sign-in intent). Shared by the sign-in and mailbox OAuth controllers so the
 * security-sensitive mechanics can't drift.
 */
export function oauthStateCookies(
  cookie: CookieJar,
  names: { state: string; companion?: string },
  path: string,
) {
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path,
    maxAge: 600,
  } as const;
  const cookieNames = names.companion ? [names.state, names.companion] : [names.state];
  const read = (name: string | undefined): string | undefined => {
    const value = name ? cookie[name]?.value : undefined;
    return typeof value === "string" && value ? value : undefined;
  };
  return {
    set(state: string, companion?: string): void {
      cookie[names.state]!.set({ ...options, value: state });
      if (names.companion && companion) {
        cookie[names.companion]!.set({ ...options, value: companion });
      }
    },
    clear(): void {
      for (const name of cookieNames) {
        cookie[name]!.set({ secure: isProduction, value: "", path, maxAge: 0 });
      }
    },
    state: (): string | undefined => read(names.state),
    companion: (): string | undefined => read(names.companion),
  };
}
