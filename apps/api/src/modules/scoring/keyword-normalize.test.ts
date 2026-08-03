// Pure string helpers - no env/Prisma. Imported directly from the module file.

import {
  expandSynonyms,
  normalizeKeyword,
  normalizeMatchPhrase,
  normalizePhrase,
} from "./keyword-normalize";
import { describe, expect, it } from "bun:test";

describe("normalizeKeyword", () => {
  it("lowercases and strips all non-alphanumerics", () => {
    expect(normalizeKeyword("Next.js")).toBe("nextjs");
    expect(normalizeKeyword("C++")).toBe("c++");
    expect(normalizeKeyword("C#")).toBe("c#");
    expect(normalizeKeyword("React JS")).toBe("reactjs");
  });

  it("keeps C, C++ and C# distinct", () => {
    const compact = ["C", "C++", "C#"].map(normalizeKeyword);
    expect(compact).toEqual(["c", "c++", "c#"]);
    expect(new Set(compact).size).toBe(3);
  });
});

describe("normalizeMatchPhrase", () => {
  it("collapses to single spaces while keeping + and #", () => {
    expect(normalizeMatchPhrase("C++ / C# devs")).toBe("c++ c# devs");
    expect(normalizeMatchPhrase("Node.js")).toBe("node js");
    expect(normalizeMatchPhrase("  Node/Express  ")).toBe("node express");
  });
});

describe("normalizePhrase", () => {
  it("collapses non-alphanumerics to single spaces, preserving word boundaries", () => {
    expect(normalizePhrase("React.js applications")).toBe("react js applications");
    expect(normalizePhrase("  Node/Express  ")).toBe("node express");
  });
});

describe("expandSynonyms", () => {
  it("expands a canonical term to all its recognised spellings", () => {
    const variants = expandSynonyms("js");
    expect(variants).toContain("js");
    expect(variants).toContain("javascript");
  });

  it("expands an alternate spelling back through its canonical term", () => {
    // "javascript" is an alt of the canon "js"; both directions must resolve to the shared set.
    const variants = expandSynonyms("JavaScript");
    expect(variants).toContain("js");
    expect(variants).toContain("javascript");
  });

  it("normalizes a plain term to its compact form with no synonyms", () => {
    expect(expandSynonyms("Rust")).toEqual(["rust"]);
  });

  it("keeps the C++ and C# families apart", () => {
    const cpp = expandSynonyms("C++");
    const csharp = expandSynonyms("C#");
    expect(csharp).toContain("csharp");
    expect(cpp.filter((variant) => csharp.includes(variant))).toEqual([]);
  });

  it("expands abbreviations outside tech in both directions", () => {
    expect(expandSynonyms("RN")).toContain("registered nurse");
    expect(expandSynonyms("registered nurse")).toContain("rn");
    expect(expandSynonyms("CPA")).toContain("certified public accountant");
  });

  it("is memoized: repeated calls return the same array instance", () => {
    expect(expandSynonyms("k8s")).toBe(expandSynonyms("k8s"));
  });
});
