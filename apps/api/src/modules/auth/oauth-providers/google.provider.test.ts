import { GoogleSignInProvider } from "./google.provider";
import type { OAuthProviderConfig } from "./sign-in-provider";
import { describe, expect, it } from "bun:test";

const config: OAuthProviderConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "http://localhost:4101/api/auth/oauth/google/callback",
};

describe("GoogleSignInProvider.getAuthorizeUrl", () => {
  it("builds the authorize URL with identity scopes and no offline access", () => {
    const url = new URL(new GoogleSignInProvider().getAuthorizeUrl(config, "state-123"));
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toContain("email");
    // Identity-only: no refresh token is ever requested or stored.
    expect(url.searchParams.get("access_type")).not.toBe("offline");
  });
});
