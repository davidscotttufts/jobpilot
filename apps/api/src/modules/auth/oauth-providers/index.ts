import type { OAuthProviderInput } from "@jobpilot/contracts/auth";
import { GithubSignInProvider } from "./github.provider";
import { GoogleSignInProvider } from "./google.provider";
import type { SignInProvider } from "./sign-in-provider";

export const signInProviders: Record<OAuthProviderInput, SignInProvider> = {
  google: new GoogleSignInProvider(),
  github: new GithubSignInProvider(),
};
