// Deterministic scoring heuristic. `fit.ts` imports only `keyword-normalize` + a type, so no env/Prisma.

import { scoreFit } from "./fit";
import type { FitProfile, JobDigest } from "./scoring.schema";
import { describe, expect, it } from "bun:test";

const digest = (over: Partial<JobDigest>): JobDigest => ({
  title: "",
  company: "",
  techStack: [],
  requirements: [],
  responsibilities: [],
  descriptionExcerpt: "",
  yearsExperience: null,
  ...over,
});

const profile = (over: Partial<FitProfile>): FitProfile => ({
  techStack: [],
  yearsExperience: null,
  ...over,
});

describe("scoreFit", () => {
  it("scores a perfect match at 100 with full confidence", () => {
    const result = scoreFit(
      digest({
        techStack: ["react"],
        requirements: ["React experience required"],
        yearsExperience: 3,
      }),
      profile({ techStack: ["react"], yearsExperience: 5 }),
    );
    // 0.5 tech + 0.2 years + 0.3 req-density, all maxed.
    expect(result.score).toBe(100);
    expect(result.confidence).toBe(1);
    expect(result.strongMatches).toEqual(["react"]);
    expect(result.gaps).toEqual([]);
  });

  it("marks unmatched digest tech as gaps and scores low", () => {
    const result = scoreFit(
      digest({ techStack: ["rust", "go"] }),
      profile({ techStack: ["react"] }),
    );
    expect(result.strongMatches).toEqual([]);
    expect(result.gaps).toEqual(["rust", "go"]);
    expect(result.score).toBeLessThan(20);
  });

  it("matches through synonyms (js ↔ javascript)", () => {
    const result = scoreFit(digest({ techStack: ["JavaScript"] }), profile({ techStack: ["js"] }));
    expect(result.strongMatches).toEqual(["JavaScript"]);
    expect(result.gaps).toEqual([]);
  });

  it("rewards meeting the years requirement over falling short of it", () => {
    const base = digest({ techStack: ["react"], yearsExperience: 7 });
    const meets = scoreFit(base, profile({ techStack: ["react"], yearsExperience: 8 }));
    const shortOf = scoreFit(base, profile({ techStack: ["react"], yearsExperience: 2 }));
    expect(meets.score).toBeGreaterThan(shortOf.score);
  });

  it("returns zero confidence when the digest has no tech, requirements, or years", () => {
    const result = scoreFit(digest({}), profile({ techStack: ["react"] }));
    expect(result.confidence).toBe(0);
    expect(result.strongMatches).toEqual([]);
    expect(result.gaps).toEqual([]);
  });
});
