import { type GithubEmail, GithubSignInProvider, pickGithubEmail } from "./github.provider";
import type { OAuthProviderConfig } from "./sign-in-provider";
import { describe, expect, it } from "bun:test";

const config: OAuthProviderConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "http://localhost:4101/api/auth/oauth/github/callback",
};

function email(overrides: Partial<GithubEmail>): GithubEmail {
  return { email: "a@example.com", primary: false, verified: false, ...overrides };
}

describe("pickGithubEmail", () => {
  it("prefers the primary verified address", () => {
    const picked = pickGithubEmail([
      email({ email: "old@example.com", verified: true }),
      email({ email: "main@example.com", primary: true, verified: true }),
    ]);
    expect(picked).toBe("main@example.com");
  });

  it("falls back to any verified address when the primary is unverified", () => {
    const picked = pickGithubEmail([
      email({ email: "main@example.com", primary: true }),
      email({ email: "backup@example.com", verified: true }),
    ]);
    expect(picked).toBe("backup@example.com");
  });

  it("returns null when no address is verified", () => {
    expect(pickGithubEmail([email({ primary: true })])).toBeNull();
    expect(pickGithubEmail([])).toBeNull();
  });
});

describe("GithubSignInProvider.getAuthorizeUrl", () => {
  it("builds the authorize URL with state, scope, and redirect", () => {
    const url = new URL(new GithubSignInProvider().getAuthorizeUrl(config, "state-123"));
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("scope")).toBe("user:email");
    expect(url.searchParams.get("state")).toBe("state-123");
  });
});
