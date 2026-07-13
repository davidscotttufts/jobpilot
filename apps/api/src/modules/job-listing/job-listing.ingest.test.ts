import type { PrismaClient } from "@/generated/prisma/client";
import { JobListingIngestService } from "./job-listing.ingest";
import type { ListingSourceJob } from "./listing-draft";
import { describe, expect, it } from "bun:test";

const job = (url: string): ListingSourceJob => ({
  title: "Staff Engineer",
  company: "Acme",
  url,
  location: "Austin, TX",
  digest: JSON.stringify({ techStack: ["Go"] }),
});

interface FakeOptions {
  /** Throw a unique violation on the first create, as a racing agent would cause. */
  raceOnFirstCreate?: boolean;
  /** Resolves each call only when the returned trigger is fired, so overlap is observable. */
  gate?: { hold: true };
}

/** Stand-in for Prisma: records calls and can simulate the concurrent-insert race. */
function fakePrisma(options: FakeOptions = {}) {
  const calls: string[] = [];
  const pending: (() => void)[] = [];
  let creates = 0;
  let concurrent = 0;
  let peak = 0;

  const settle = async <T>(value: T): Promise<T> => {
    concurrent++;
    peak = Math.max(peak, concurrent);
    if (options.gate) {
      await new Promise<void>((resolve) => pending.push(resolve));
    }
    concurrent--;
    return value;
  };

  const prisma = {
    jobListingSource: {
      findUnique: async () => {
        calls.push("source.findUnique");
        return settle(null);
      },
      update: async () => settle(undefined),
    },
    jobListing: {
      findUnique: async () => {
        calls.push("listing.findUnique");
        return settle(null);
      },
      update: async () => {
        calls.push("listing.update");
        return settle(undefined);
      },
      create: async () => {
        calls.push("listing.create");
        creates++;
        if (options.raceOnFirstCreate && creates === 1) {
          concurrent--;
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        return settle(undefined);
      },
    },
  } as unknown as PrismaClient;

  return {
    prisma,
    calls,
    flush: () => {
      for (const resolve of pending.splice(0)) {
        resolve();
      }
    },
    peak: () => peak,
  };
}

describe("ingest", () => {
  it("skips a job the quality gate rejects, without touching the database", async () => {
    const fake = fakePrisma();
    const svc = new JobListingIngestService(fake.prisma);

    expect(await svc.ingest({ ...job("https://x.com/1"), digest: null })).toBe("skipped");
    expect(fake.calls).toEqual([]);
  });

  it("creates a listing for an unseen posting", async () => {
    const fake = fakePrisma();
    const svc = new JobListingIngestService(fake.prisma);

    expect(await svc.ingest(job("https://x.com/1"))).toBe("created");
    expect(fake.calls).toContain("listing.create");
  });

  // The race the removed $transaction never actually prevented: at READ COMMITTED two agents can
  // both miss the lookup and both insert. The unique constraint is what makes them converge.
  it("retries once when another agent wins the insert race, and converges", async () => {
    const fake = fakePrisma({ raceOnFirstCreate: true });
    const svc = new JobListingIngestService(fake.prisma);

    // Second pass re-reads; the fake still reports "not found", so it re-creates rather than throw.
    expect(await svc.ingest(job("https://x.com/1"))).toBe("created");
    expect(fake.calls.filter((c) => c === "listing.create")).toHaveLength(2);
  });

  it("gives up after one retry rather than looping on a persistent conflict", async () => {
    const fake = fakePrisma();
    const always = {
      ...fake.prisma,
      jobListingSource: { findUnique: async () => null },
      jobListing: {
        findUnique: async () => null,
        create: async () => {
          throw Object.assign(new Error("conflict"), { code: "P2002" });
        },
      },
    } as unknown as PrismaClient;

    expect(new JobListingIngestService(always).ingest(job("https://x.com/1"))).rejects.toThrow();
  });
});

describe("concurrency ceiling", () => {
  it("never runs more than 4 ingests at once, and queues the rest", async () => {
    const fake = fakePrisma({ gate: { hold: true } });
    const svc = new JobListingIngestService(fake.prisma);

    // 12 concurrent ingests against a gate that holds every query open.
    const all = Array.from({ length: 12 }, (_, i) => svc.ingest(job(`https://x.com/${i}`)));

    // Let the held queries drain in waves until everything completes.
    for (let i = 0; i < 40; i++) {
      await Promise.resolve();
      fake.flush();
    }
    await Promise.all(all);

    // The gate counts queries in flight; with a ceiling of 4 ingests it can never exceed 4.
    expect(fake.peak()).toBeLessThanOrEqual(4);
  });
});
