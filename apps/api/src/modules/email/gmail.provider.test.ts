// Scope-string and history-paging helpers in isolation - no Google client, no database.

import {
  GMAIL_READ_SCOPE,
  GMAIL_SCOPES,
  GMAIL_SEND_SCOPE,
  type HistoryPage,
  readAddedMessageIds,
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

describe("readAddedMessageIds", () => {
  function pager(pages: HistoryPage[]) {
    const requested: (string | undefined)[] = [];
    const fetchPage = (pageToken?: string): Promise<HistoryPage> => {
      requested.push(pageToken);
      const index = pageToken === undefined ? 0 : Number(pageToken);
      return Promise.resolve(pages[index] as HistoryPage);
    };
    return { fetchPage, requested };
  }

  it("reads every page before the cursor moves", async () => {
    const { fetchPage, requested } = pager([
      { messageIds: ["a", "b"], historyId: "900", nextPageToken: "1" },
      { messageIds: ["c"], historyId: "900", nextPageToken: "2" },
      { messageIds: ["d"], historyId: "900", nextPageToken: null },
    ]);
    const result = await readAddedMessageIds(fetchPage);
    expect(result).toEqual({ messageIds: ["a", "b", "c", "d"], historyId: "900" });
    expect(requested).toEqual([undefined, "1", "2"]);
  });

  it("keeps going past a page the type filter left empty", async () => {
    const { fetchPage } = pager([
      { messageIds: [], historyId: "900", nextPageToken: "1" },
      { messageIds: ["a"], historyId: "900", nextPageToken: null },
    ]);
    expect((await readAddedMessageIds(fetchPage)).messageIds).toEqual(["a"]);
  });

  it("lists a message once when several history records add it", async () => {
    const { fetchPage } = pager([
      { messageIds: ["a", "b", "a"], historyId: "900", nextPageToken: "1" },
      { messageIds: ["b", "c"], historyId: "900", nextPageToken: null },
    ]);
    expect((await readAddedMessageIds(fetchPage)).messageIds).toEqual(["a", "b", "c"]);
  });

  it("reports no cursor when Gmail returns none", async () => {
    const { fetchPage } = pager([{ messageIds: [], historyId: null, nextPageToken: null }]);
    expect(await readAddedMessageIds(fetchPage)).toEqual({ messageIds: [], historyId: null });
  });
});
