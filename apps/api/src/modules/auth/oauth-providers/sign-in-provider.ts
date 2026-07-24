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
