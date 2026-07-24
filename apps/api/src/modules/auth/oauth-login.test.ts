import { canUnlink, resolveOAuthLogin } from "./oauth-login";
import type { OAuthProfile } from "./oauth-providers";
import { describe, expect, it } from "bun:test";

function profile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    providerAccountId: "123",
    email: "user@example.com",
    emailVerified: true,
    ...overrides,
  };
}

describe("resolveOAuthLogin", () => {
  it("signs in a known identity even when the provider email is unverified", () => {
    const decision = resolveOAuthLogin(profile({ emailVerified: false }), "user-1", null);
    expect(decision).toEqual({ action: "signin", userId: "user-1" });
  });

  it("prefers the linked identity over an email match", () => {
    const decision = resolveOAuthLogin(profile(), "user-1", {
      id: "user-2",
      emailVerified: true,
    });
    expect(decision).toEqual({ action: "signin", userId: "user-1" });
  });

  it("rejects an unverified provider email with no linked identity", () => {
    expect(resolveOAuthLogin(profile({ emailVerified: false }), null, null)).toEqual({
      action: "reject",
      reason: "email_unverified",
    });
    // Even when the email matches an existing user - control of the mailbox is unproven.
    expect(
      resolveOAuthLogin(profile({ emailVerified: false }), null, {
        id: "user-1",
        emailVerified: true,
      }),
    ).toEqual({ action: "reject", reason: "email_unverified" });
  });

  it("auto-links a verified email to its existing account", () => {
    const decision = resolveOAuthLogin(profile(), null, { id: "user-1", emailVerified: true });
    expect(decision).toEqual({ action: "autolink", userId: "user-1", markVerified: false });
  });

  it("marks a still-unverified account verified on auto-link", () => {
    const decision = resolveOAuthLogin(profile(), null, { id: "user-1", emailVerified: false });
    expect(decision).toEqual({ action: "autolink", userId: "user-1", markVerified: true });
  });

  it("signs up a verified email with no matching account", () => {
    expect(resolveOAuthLogin(profile(), null, null)).toEqual({ action: "signup" });
  });
});

describe("canUnlink", () => {
  it("forbids removing the last sign-in method", () => {
    expect(canUnlink(false, 1)).toBe(false);
  });

  it("allows unlinking when a password remains", () => {
    expect(canUnlink(true, 1)).toBe(true);
  });

  it("allows unlinking when another provider remains", () => {
    expect(canUnlink(false, 2)).toBe(true);
  });
});
