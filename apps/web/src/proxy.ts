import { createApiClient } from "@jobpilot/api-client";
import { type NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/api/base-url";
import { isAdminRole } from "@/lib/roles";
import { isProfileEmpty } from "@/utils/profile";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Per-request Eden client that forwards the incoming auth cookie
  const cookie = request.headers.get("cookie") ?? "";
  const { api } = createApiClient(API_BASE_URL, {
    headers: cookie ? { cookie } : {},
    fetch: { cache: "no-store" },
  });

  // One call yields both the verified flag and the profile
  const { data, error } = await api.auth.me.get();

  // Email verification is a non-blocking banner in-app, so it doesn't factor into routing.
  const onboarded =
    !error && data !== null && data.profile !== null && !isProfileEmpty(data.profile);

  // The root is the public marketing landing: stay public for signed-out /
  // half-onboarded visitors, but bounce fully-onboarded users into the app.
  if (request.nextUrl.pathname === "/") {
    return onboarded
      ? NextResponse.redirect(new URL("/workspace", request.url))
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

  // The /me call above already carried the role, so gating /admin here is free
  if (request.nextUrl.pathname.startsWith("/admin") && !isAdminRole(data.user.role)) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|docs|install|jobs|leaderboard|u/|login|register|onboarding|verify-email|forgot-password|reset-password|opengraph-image|apple-icon|favicon.ico|.*\\..*).*)",
  ],
};
