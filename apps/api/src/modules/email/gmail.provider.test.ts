// Scope-string helpers in isolation - no Google client, no database.

import {
  GMAIL_READ_SCOPE,
  GMAIL_SCOPES,
  GMAIL_SEND_SCOPE,
  scopeCanRead,
  scopeCanSend,
} from "./gmail.provider";
import { describe, expect, it } from "bun:test";

const FULL_GRANT = GMAIL_SCOPES.join(" ");

describe("scopeCanRead", () => {
  it("accepts a full grant", () => {
    expect(scopeCanRead(FULL_GRANT)).toBe(true);
  });

  it("rejects a grant the user narrowed at the consent screen", () => {
    expect(scopeCanRead(`${GMAIL_SEND_SCOPE} openid email`)).toBe(false);
  });

  it("rejects a sign-in-only grant", () => {
    expect(scopeCanRead("openid email profile")).toBe(false);
  });

  it("rejects a missing scope", () => {
    expect(scopeCanRead(null)).toBe(false);
    expect(scopeCanRead(undefined)).toBe(false);
    expect(scopeCanRead("")).toBe(false);
  });

  it("does not match a scope that merely shares a prefix", () => {
    expect(scopeCanRead("https://www.googleapis.com/auth/gmail.readonly.extra")).toBe(false);
  });
});

describe("scopeCanSend", () => {
  it("accepts a full grant", () => {
    expect(scopeCanSend(FULL_GRANT)).toBe(true);
  });

  it("rejects a read-only grant", () => {
    expect(scopeCanSend(`${GMAIL_READ_SCOPE} openid email`)).toBe(false);
  });
});
