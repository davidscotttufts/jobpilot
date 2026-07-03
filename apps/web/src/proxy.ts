import { createApiClient } from "@jobpilot/api-client";
import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL } from "@/api/base-url";
import { isProfileEmpty } from "@/utils/profile";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Per-request Eden client that forwards the incoming auth cookie (middleware
  // has no ambient cookie jar, so we pass it explicitly).
  const cookie = request.headers.get("cookie") ?? "";
  const { api } = createApiClient(API_BASE_URL, {
    headers: cookie ? { cookie } : {},
    fetch: { cache: "no-store" },
  });

  // One call yields both the verified flag and the profile (auth rides the cookie).
  const { data, error } = await api.auth.me.get();

  // Email verification is a non-blocking banner in-app (outward-facing actions
  // are gated server-side), so it doesn't factor into routing.
  const onboarded =
    !error && data !== null && data.profile !== null && !isProfileEmpty(data.profile);

  // The root is the public marketing landing: stay public for signed-out /
  // half-onboarded visitors, but bounce fully-onboarded users into the app.
  if (request.nextUrl.pathname === "/") {
    return onboarded
      ? NextResponse.redirect(new URL("/pipeline", request.url))
      : NextResponse.next();
  }

  // Not authenticated -> send to login.
  if (error || data === null) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Profile not filled in -> onboarding.
  if (data.profile === null || isProfileEmpty(data.profile)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|docs|install|login|register|onboarding|verify-email|forgot-password|reset-password|opengraph-image|favicon.ico|.*\\..*).*)",
  ],
};
