import "server-only";
import { gmailProvider } from "./gmail";
import type { EmailProvider } from "./provider";

export function getProvider(name: string): EmailProvider {
  if (name === "gmail") return gmailProvider;
  throw new Error(`Unsupported email provider: ${name}`);
}

export type { EmailProvider, NormalizedMessage, SyncResult, TokenSet } from "./provider";
