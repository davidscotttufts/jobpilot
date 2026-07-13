import { groupTechFacets, resolveTechFilter } from "./tech-facets";
import { describe, expect, it } from "bun:test";

describe("groupTechFacets", () => {
  it("merges casings of one tech and sums their counts", () => {
    const { facets } = groupTechFacets([
      { tech: "React", count: 40 },
      { tech: "react", count: 5 },
      { tech: "Go", count: 12 },
    ]);

    expect(facets).toEqual([
      { value: "React", count: 45 },
      { value: "Go", count: 12 },
    ]);
  });

  it("labels a group with its most common casing, not the first row seen", () => {
    const { facets } = groupTechFacets([
      { tech: "typescript", count: 3 },
      { tech: "TypeScript", count: 30 },
    ]);

    expect(facets[0]).toEqual({ value: "TypeScript", count: 33 });
  });

  it("orders by count, then alphabetically so the option list is stable", () => {
    const { facets } = groupTechFacets([
      { tech: "Rust", count: 7 },
      { tech: "Kotlin", count: 7 },
      { tech: "Python", count: 9 },
    ]);

    expect(facets.map((facet) => facet.value)).toEqual(["Python", "Kotlin", "Rust"]);
  });

  it("keeps every stored casing as a lookup variant", () => {
    const { variants } = groupTechFacets([
      { tech: "React", count: 4 },
      { tech: "REACT", count: 1 },
    ]);

    expect(variants.get("react")).toEqual(["React", "REACT"]);
  });

  it("ignores blank entries", () => {
    const { facets } = groupTechFacets([
      { tech: "  ", count: 3 },
      { tech: " Go ", count: 2 },
    ]);

    expect(facets).toEqual([{ value: "Go", count: 2 }]);
  });

  // Counts are published-only, so a hidden-only tech arrives at 0 - it stays queryable for admins
  // via `variants`, but must never surface in the public option list.
  it("keeps a hidden-only tech out of the options but still resolvable", () => {
    const { facets, variants } = groupTechFacets([
      { tech: "Go", count: 2 },
      { tech: "Cobol", count: 0 },
    ]);

    expect(facets).toEqual([{ value: "Go", count: 2 }]);
    expect(variants.get("cobol")).toEqual(["Cobol"]);
  });
});

describe("resolveTechFilter", () => {
  const { variants } = groupTechFacets([
    { tech: "React", count: 4 },
    { tech: "react", count: 1 },
    { tech: "Go", count: 2 },
  ]);

  it("expands a request into every casing stored, so `has` matching stays case-insensitive", () => {
    expect(resolveTechFilter(["react"], variants).sort()).toEqual(["React", "react"]);
  });

  it("passes an unknown tech through, so the filter simply matches nothing", () => {
    expect(resolveTechFilter(["Cobol"], variants)).toEqual(["Cobol"]);
  });

  it("dedupes across requested values", () => {
    expect(resolveTechFilter(["Go", "go", " "], variants)).toEqual(["Go"]);
  });
});
