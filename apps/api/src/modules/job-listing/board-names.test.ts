import { boardNameLookup, distinctBoardNames } from "./board-names";
import { describe, expect, it } from "bun:test";

const name = boardNameLookup([
  { domain: "linkedin.com", name: "LinkedIn" },
  { domain: "indeed.com", name: "Indeed" },
  { domain: "hiring.cafe", name: "Hiring Cafe " },
]);

describe("boardNameLookup", () => {
  it("names a board by its listed catalog row", () => {
    expect(name("linkedin.com")).toBe("LinkedIn");
    expect(name("hiring.cafe")).toBe("Hiring Cafe");
  });

  it("reduces a URL-shaped board to its host before matching", () => {
    expect(name("https://www.LinkedIn.com/jobs/")).toBe("LinkedIn");
  });

  it("falls back to the parent domain for a regional subdomain", () => {
    expect(name("fr.indeed.com")).toBe("Indeed");
  });

  it("matches a bare board name as its .com domain", () => {
    expect(name("linkedin")).toBe("LinkedIn");
  });

  it("shows the bare host when no listed row matches", () => {
    expect(name("https://www.naukri.com/")).toBe("naukri.com");
  });
});

describe("distinctBoardNames", () => {
  it("counts one board once however many times the posting was reposted there", () => {
    const sources = Array.from({ length: 6 }, () => ({ board: "linkedin.com" }));

    expect(distinctBoardNames(sources, name)).toEqual(["LinkedIn"]);
  });

  it("keeps source order and merges spellings that name the same board", () => {
    const sources = [
      { board: "indeed.com" },
      { board: "linkedin" },
      { board: "www.linkedin.com" },
      { board: "in.indeed.com" },
      { board: "naukri.com" },
    ];

    expect(distinctBoardNames(sources, name)).toEqual(["Indeed", "LinkedIn", "naukri.com"]);
  });

  it("drops sources with no board", () => {
    expect(distinctBoardNames([{ board: null }, { board: " " }], name)).toEqual([]);
  });
});
