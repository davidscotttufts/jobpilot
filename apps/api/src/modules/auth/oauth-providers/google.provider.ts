import { google } from "googleapis";
import { normalizeEmail } from "@/common/utils/email";
import type { OAuthProfile, OAuthProviderConfig, SignInProvider } from "./sign-in-provider";

export class GoogleSignInProvider implements SignInProvider {
  private makeClient(config: OAuthProviderConfig) {
    return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  }

  getAuthorizeUrl(config: OAuthProviderConfig, state: string): string {
    // No offline access: we only need identity, so no refresh token is ever issued.
    return this.makeClient(config).generateAuthUrl({
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
      state,
    });
  }

  async exchangeCode(config: OAuthProviderConfig, code: string): Promise<OAuthProfile> {
    const client = this.makeClient(config);
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) {
      throw new Error("Google did not return an access token");
    }
    client.setCredentials(tokens);
    const me = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
    const { id, email, verified_email } = me.data;
    if (!id || !email) {
      throw new Error("Could not resolve the Google account");
    }
    return {
      providerAccountId: id,
      email: normalizeEmail(email),
      emailVerified: verified_email === true,
    };
  }
}
