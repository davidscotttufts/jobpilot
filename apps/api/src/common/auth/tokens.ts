import { createHash, randomBytes } from "node:crypto";

/** Opaque bearer token (session, terminal, magic link). Only its hash is ever persisted. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
