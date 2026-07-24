import type { Cookie } from "elysia";
import { env } from "@/env";

type CookieJar = Record<string, Cookie<unknown>>;

const isProduction = env.NODE_ENV === "production";

/**
 * The short-lived httpOnly cookie pair backing an OAuth redirect flow: the CSRF
 * state plus one companion value (provider, intent, ...). Shared by the sign-in
 * and mailbox OAuth controllers so the security-sensitive mechanics can't drift.
 */
export function oauthStateCookies(
  cookie: CookieJar,
  names: { state: string; companion: string },
  path: string,
) {
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path,
    maxAge: 600,
  } as const;
  const read = (name: string): string | undefined => {
    const value = cookie[name]?.value;
    return typeof value === "string" && value ? value : undefined;
  };
  return {
    set(state: string, companion: string): void {
      cookie[names.state]!.set({ ...options, value: state });
      cookie[names.companion]!.set({ ...options, value: companion });
    },
    clear(): void {
      cookie[names.state]!.set({ secure: isProduction, value: "", path, maxAge: 0 });
      cookie[names.companion]!.set({ secure: isProduction, value: "", path, maxAge: 0 });
    },
    state: (): string | undefined => read(names.state),
    companion: (): string | undefined => read(names.companion),
  };
}
