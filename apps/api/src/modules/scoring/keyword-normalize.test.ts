// Pure string helpers - no env/Prisma. Imported directly from the module file.

import { expandSynonyms, normalizeKeyword, normalizePhrase } from "./keyword-normalize";
import { describe, expect, it } from "bun:test";

describe("normalizeKeyword", () => {
  it("lowercases and strips all non-alphanumerics", () => {
    expect(normalizeKeyword("Next.js")).toBe("nextjs");
    expect(normalizeKeyword("C++")).toBe("c");
    expect(normalizeKeyword("React JS")).toBe("reactjs");
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

  it("is memoized: repeated calls return the same array instance", () => {
    expect(expandSynonyms("k8s")).toBe(expandSynonyms("k8s"));
  });
});
