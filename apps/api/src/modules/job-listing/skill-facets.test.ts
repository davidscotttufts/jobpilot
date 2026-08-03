import { groupSkillFacets, resolveSkillFilter } from "./skill-facets";
import { describe, expect, it } from "bun:test";

describe("groupSkillFacets", () => {
  it("merges casings of one skill and sums their counts", () => {
    const { facets } = groupSkillFacets([
      { skill: "React", count: 40 },
      { skill: "react", count: 5 },
      { skill: "Go", count: 12 },
    ]);

    expect(facets).toEqual([
      { value: "React", count: 45 },
      { value: "Go", count: 12 },
    ]);
  });

  it("labels a group with its most common casing, not the first row seen", () => {
    const { facets } = groupSkillFacets([
      { skill: "typescript", count: 3 },
      { skill: "TypeScript", count: 30 },
    ]);

    expect(facets[0]).toEqual({ value: "TypeScript", count: 33 });
  });

  it("orders by count, then alphabetically so the option list is stable", () => {
    const { facets } = groupSkillFacets([
      { skill: "Rust", count: 7 },
      { skill: "Kotlin", count: 7 },
      { skill: "Python", count: 9 },
    ]);

    expect(facets.map((facet) => facet.value)).toEqual(["Python", "Kotlin", "Rust"]);
  });

  it("keeps every stored casing as a lookup variant", () => {
    const { variants } = groupSkillFacets([
      { skill: "React", count: 4 },
      { skill: "REACT", count: 1 },
    ]);

    expect(variants.get("react")).toEqual(["React", "REACT"]);
  });

  it("ignores blank entries", () => {
    const { facets } = groupSkillFacets([
      { skill: "  ", count: 3 },
      { skill: " Go ", count: 2 },
    ]);

    expect(facets).toEqual([{ value: "Go", count: 2 }]);
  });

  // Counts are published-only, so a hidden-only skill arrives at 0 - it stays queryable for admins
  // via `variants`, but must never surface in the public option list.
  it("keeps a hidden-only skill out of the options but still resolvable", () => {
    const { facets, variants } = groupSkillFacets([
      { skill: "Go", count: 2 },
      { skill: "Cobol", count: 0 },
    ]);

    expect(facets).toEqual([{ value: "Go", count: 2 }]);
    expect(variants.get("cobol")).toEqual(["Cobol"]);
  });
});

describe("resolveSkillFilter", () => {
  const { variants } = groupSkillFacets([
    { skill: "React", count: 4 },
    { skill: "react", count: 1 },
    { skill: "Go", count: 2 },
  ]);

  it("expands a request into every casing stored, so `has` matching stays case-insensitive", () => {
    expect(resolveSkillFilter(["react"], variants).sort()).toEqual(["React", "react"]);
  });

  it("passes an unknown skill through, so the filter simply matches nothing", () => {
    expect(resolveSkillFilter(["Cobol"], variants)).toEqual(["Cobol"]);
  });

  it("dedupes across requested values", () => {
    expect(resolveSkillFilter(["Go", "go", " "], variants)).toEqual(["Go"]);
  });
});
