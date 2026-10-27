import type { Cookie } from "elysia";
import { DAY_MS } from "@/common/date/buckets";
import { env } from "@/env";

type CookieJar = Record<string, Cookie<unknown>>;

interface OAuthStateNames {
  state: string;
  companion?: string;
}

interface OAuthCallbackQuery {
  error?: string;
  code?: string;
  state?: string;
}

type CallbackCheck =
  | { code: string; reason: null }
  | { code: null; reason: "access_denied" | "provider_error" | "invalid_callback" };

const SESSION_COOKIE = "session";
const sessionOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
} as const;

function readCookie(
  cookie: Record<string, Cookie<unknown> | undefined>,
  name: string | undefined,
): string | null {
  const value = name ? cookie[name]?.value : null;
  return typeof value === "string" && value ? value : null;
}

/** The raw session token from the httpOnly cookie, if any. */
export function readSessionCookie(
  cookie: Record<string, Cookie<unknown> | undefined>,
): string | null {
  return readCookie(cookie, SESSION_COOKIE);
}

export function setSessionCookie(cookie: CookieJar, token: string): void {
  cookie[SESSION_COOKIE]!.set({
    ...sessionOptions,
    maxAge: (env.SESSION_TTL_DAYS * DAY_MS) / 1000,
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
export function oauthStateCookies(cookie: CookieJar, names: OAuthStateNames, path: string) {
  const options = { ...sessionOptions, path, maxAge: 600 };
  const cookieNames = names.companion ? [names.state, names.companion] : [names.state];
  return {
    set(state: string, companion?: string): void {
      cookie[names.state]!.set({ ...options, value: state });
      if (names.companion && companion) {
        cookie[names.companion]!.set({ ...options, value: companion });
      }
    },
    clear(): void {
      for (const name of cookieNames) {
        cookie[name]!.set({ secure: options.secure, value: "", path, maxAge: 0 });
      }
    },
    companion: (): string | null => readCookie(cookie, names.companion),
    /** The provider's authorization code, or why the callback is refused (provider error or CSRF state mismatch). */
    checkCallback(query: OAuthCallbackQuery): CallbackCheck {
      if (query.error) {
        const reason = query.error === "access_denied" ? "access_denied" : "provider_error";
        return { code: null, reason };
      }
      if (!query.code || !query.state || readCookie(cookie, names.state) !== query.state) {
        return { code: null, reason: "invalid_callback" };
      }
      return { code: query.code, reason: null };
    },
  };
}
