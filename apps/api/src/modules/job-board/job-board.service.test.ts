import type { PrismaClient } from "@/generated/prisma/client";
import { JobBoardService } from "./job-board.service";
import { describe, expect, it } from "bun:test";

const linkedin = { name: "LinkedIn", domain: "linkedin.com", searchUrl: "https://li" };

const CATALOG = [
  { id: "b1", domain: "linkedin.com", name: "LinkedIn" },
  { id: "b2", domain: "indeed.com", name: "Indeed" },
];

function makeService() {
  const upserts: Record<string, unknown>[] = [];
  const links: Record<string, unknown>[] = [];
  const db = {
    jobBoard: {
      findMany: async ({ where }: { where: { domain: { in: string[] } } }) =>
        CATALOG.filter((row) => where.domain.in.includes(row.domain)),
      upsert: async (args: Record<string, unknown>) => {
        upserts.push(args);
        return { id: "new" };
      },
    },
    userJobBoard: {
      findMany: async () => [{ id: "l1", jobBoard: linkedin }],
      create: async ({ data }: { data: Record<string, unknown> }) => {
        links.push(data);
        return { id: "l2", jobBoard: linkedin };
      },
    },
  } as unknown as PrismaClient;
  return { svc: new JobBoardService(db), upserts, links };
}

describe("JobBoardService", () => {
  it("projects a link to its id plus the catalog fields", async () => {
    const { svc } = makeService();
    expect(await svc.list("u1")).toEqual([
      { id: "l1", name: "LinkedIn", domain: "linkedin.com", searchUrl: "https://li" },
    ]);
  });

  it("links by domain without touching the catalog row", async () => {
    const { svc, upserts, links } = makeService();
    await svc.create("u1", { domain: "linkedin.com", name: "ignored" });
    expect(upserts).toEqual([]);
    expect(links[0]).toEqual({ userId: "u1", jobBoardId: "b1" });
  });

  it("adds an unknown domain to the catalog unlisted, named by the domain when no name is given", async () => {
    const { svc, upserts, links } = makeService();
    await svc.create("u1", { domain: "jobs.example", searchUrl: "" });
    expect(upserts[0]).toMatchObject({
      create: { domain: "jobs.example", name: "jobs.example", searchUrl: null },
    });
    expect(links[0]).toEqual({ userId: "u1", jobBoardId: "new" });
  });
});

describe("JobBoardService.resolve", () => {
  it("matches a URL, a regional subdomain or a bare name to its catalog row", async () => {
    const { svc, upserts } = makeService();
    expect((await svc.resolve("https://www.LinkedIn.com/jobs/"))?.id).toBe("b1");
    expect((await svc.resolve("fr.indeed.com"))?.id).toBe("b2");
    expect((await svc.resolve("linkedin"))?.id).toBe("b1");
    expect(upserts).toEqual([]);
  });

  it("adds an unknown bare name as its .com domain", async () => {
    const { svc, upserts } = makeService();
    await svc.resolve("naukri");
    expect(upserts[0]).toMatchObject({ create: { domain: "naukri.com", name: "naukri.com" } });
  });

  it("finds nothing for a board the catalog has never seen, without creating it", async () => {
    const { svc, upserts } = makeService();
    expect(await svc.find("naukri.com")).toBeNull();
    expect(upserts).toEqual([]);
  });
});
