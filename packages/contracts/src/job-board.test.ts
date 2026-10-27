import { boardDomainSchema } from "./job-board";
import { describe, expect, it } from "bun:test";

describe("boardDomainSchema", () => {
  it("reduces a pasted URL to its bare host", () => {
    expect(boardDomainSchema.parse("https://www.jobserve.com/gb")).toBe("jobserve.com");
    expect(boardDomainSchema.parse(" www.Glassdoor.com/Job/ ")).toBe("glassdoor.com");
    expect(boardDomainSchema.parse("https://www.intern-list.com/?k=cs")).toBe("intern-list.com");
  });

  it("keeps a subdomain", () => {
    expect(boardDomainSchema.parse("app.jackandjill.ai/jack/dashboard")).toBe("app.jackandjill.ai");
  });

  it("rejects text that is no domain", () => {
    expect(boardDomainSchema.safeParse("Engie Careers").success).toBe(false);
    expect(boardDomainSchema.safeParse("linkedin").success).toBe(false);
    expect(boardDomainSchema.safeParse("").success).toBe(false);
  });
});
