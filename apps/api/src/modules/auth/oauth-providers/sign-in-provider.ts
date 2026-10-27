import type { OAuthErrorReason } from "@jobpilot/contracts/auth";
import { OAuthFlowError } from "@/common/auth/oauth-flow";
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Identity-only result of an OAuth exchange - provider tokens are never kept. */
export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
}

export interface SignInProvider {
  getAuthorizeUrl(config: OAuthProviderConfig, state: string): string;
  exchangeCode(config: OAuthProviderConfig, code: string): Promise<OAuthProfile>;
}

/** The provider failed or returned an unusable profile; `detail` goes to the logs, not the URL. */
export function providerError(detail: string): OAuthFlowError<OAuthErrorReason> {
  return new OAuthFlowError("provider_error", { cause: new Error(detail) });
}
