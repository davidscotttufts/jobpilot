// A Chrome profile opens in exactly one browser. Eight of nineteen recorded apply failures were
// two consumers reaching for the same one, so exclusivity is enforced rather than agreed.
import {
  acquireBrowser,
  BROWSER_SERVER_KEY,
  type BrowserLeaseWriter,
  browsersInUse,
} from "./browser-lease";
import { describe, expect, it } from "bun:test";

const NOW = new Date("2026-08-10T22:00:00Z");

interface Claim {
  id: string;
  payload: Record<string, unknown>;
}

function writer(claims: Claim[]): {
  db: BrowserLeaseWriter;
  updates: Record<string, unknown>[];
  leased: () => unknown;
} {
  const updates: Record<string, unknown>[] = [];
  const db = {
    pilotClaim: {
      findFirst: async ({ where }: { where: { id: string } }) =>
        claims.find((c) => c.id === where.id) ?? null,
      findMany: async ({ where }: { where: { id?: { not: string } } }) =>
        claims.filter((c) => c.id !== where.id?.not),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return data;
      },
    },
  };
  return {
    db: db as unknown as BrowserLeaseWriter,
    updates,
    leased: () => {
      const written = updates[0];
      if (!written) {
        throw new Error("no lease was written");
      }
      return (written.payload as Record<string, unknown>)[BROWSER_SERVER_KEY];
    },
  };
}

describe("acquireBrowser", () => {
  it("leases a free browser to the claim", async () => {
    const state = writer([{ id: "cl1", payload: {} }]);

    const result = await acquireBrowser(state.db, "u1", "cl1", "playwright", NOW);

    expect(result).toEqual({ server: "playwright" });
    expect(state.leased()).toBe("playwright");
  });

  it("refuses one another running claim already holds", async () => {
    const { db } = writer([
      { id: "cl1", payload: {} },
      { id: "cl2", payload: { [BROWSER_SERVER_KEY]: "playwright" } },
    ]);

    await expect(acquireBrowser(db, "u1", "cl1", "playwright", NOW)).rejects.toThrow(
      /held by another running item/,
    );
  });

  it("allows a second worker onto a different browser", async () => {
    const state = writer([
      { id: "cl1", payload: {} },
      { id: "cl2", payload: { [BROWSER_SERVER_KEY]: "playwright" } },
    ]);

    await acquireBrowser(state.db, "u1", "cl1", "playwright-2", NOW);

    expect(state.leased()).toBe("playwright-2");
  });

  it("keeps the rest of the claim payload", async () => {
    const state = writer([{ id: "cl1", payload: { campaignId: "c1", jobKey: "j1" } }]);

    await acquireBrowser(state.db, "u1", "cl1", "playwright", NOW);

    expect(state.updates[0]?.payload).toMatchObject({ campaignId: "c1", jobKey: "j1" });
  });

  it("refuses when the claim is not open", async () => {
    const { db } = writer([]);

    await expect(acquireBrowser(db, "u1", "gone", "playwright", NOW)).rejects.toThrow(
      /Claim is not open/,
    );
  });
});

describe("browsersInUse", () => {
  it("lists held servers once each, so the agent can pick a free one", async () => {
    const { db } = writer([
      { id: "cl1", payload: { [BROWSER_SERVER_KEY]: "playwright" } },
      { id: "cl2", payload: { [BROWSER_SERVER_KEY]: "playwright-2" } },
      { id: "cl3", payload: { [BROWSER_SERVER_KEY]: "playwright" } },
      { id: "cl4", payload: {} },
    ]);

    expect(await browsersInUse(db, "u1", NOW)).toEqual(["playwright", "playwright-2"]);
  });

  it("is empty when nothing holds a browser", async () => {
    const { db } = writer([{ id: "cl1", payload: { campaignId: "c1" } }]);

    expect(await browsersInUse(db, "u1", NOW)).toEqual([]);
  });
});
