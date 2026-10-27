import { boardHost, hostCandidates } from "./board-host";
import { describe, expect, it } from "bun:test";

describe("boardHost", () => {
  it("reduces a URL-shaped board to its host", () => {
    expect(boardHost("https://www.LinkedIn.com/jobs/")).toBe("linkedin.com");
    expect(boardHost(" naukri.com ")).toBe("naukri.com");
  });

  it("folds a host alias the way job URLs do", () => {
    expect(boardHost("https://hiring.cafe/")).toBe("hiringcafe.com");
  });
});

describe("hostCandidates", () => {
  it("tries the host, then each parent domain", () => {
    expect(hostCandidates("fr.indeed.com")).toEqual(["fr.indeed.com", "indeed.com"]);
  });

  it("tries a bare board name as its .com domain", () => {
    expect(hostCandidates("linkedin")).toEqual(["linkedin", "linkedin.com"]);
  });
});
