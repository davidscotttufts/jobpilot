import { boardDomain, boardFilter } from "./board-host";
import { describe, expect, it } from "bun:test";

describe("boardDomain", () => {
  it("reduces a URL-shaped board to its host", () => {
    expect(boardDomain("https://www.LinkedIn.com/jobs/")).toBe("linkedin.com");
    expect(boardDomain(" naukri.com ")).toBe("naukri.com");
  });

  it("keeps a tenant subdomain as its own board", () => {
    expect(boardDomain("cisco.wd5.myworkdayjobs.com")).toBe("cisco.wd5.myworkdayjobs.com");
  });

  it("reads a bare board name as its .com domain", () => {
    expect(boardDomain("linkedin")).toBe("linkedin.com");
  });

  it("folds a host alias onto the stored form", () => {
    expect(boardDomain("https://hiring.cafe/")).toBe("hiringcafe.com");
  });

  it("is null for a label that is no hostname", () => {
    expect(boardDomain("indeed_priority")).toBeNull();
    expect(boardDomain("Doxel first-party Lever")).toBeNull();
    expect(boardDomain("  ")).toBeNull();
  });
});

describe("boardFilter", () => {
  it("matches the domain and its subdomains", () => {
    expect(boardFilter("indeed.com")).toEqual({
      OR: [{ domain: "indeed.com" }, { domain: { endsWith: ".indeed.com" } }],
    });
  });

  it("matches nothing for a non-hostname", () => {
    expect(boardFilter("curated_web")).toEqual({ domain: { in: [] } });
  });
});
