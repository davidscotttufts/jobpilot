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
  requiresSponsorship: false,
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

describe("scoreFit - eligibility", () => {
  const restricted = digest({
    techStack: ["react"],
    descriptionExcerpt: "We are not able to provide visa sponsorship for this position.",
  });

  it("flags a stated sponsorship bar when the candidate needs sponsorship", () => {
    const result = scoreFit(restricted, profile({ requiresSponsorship: true }));
    expect(result.eligibilityBlocked?.kind).toBe("sponsorship");
    expect(result.eligibilityBlocked?.evidence).toContain("not able to provide visa sponsorship");
  });

  it("stays silent on sponsorship for a candidate who does not need it", () => {
    const result = scoreFit(restricted, profile({ requiresSponsorship: false }));
    expect(result.eligibilityBlocked).toBeUndefined();
  });

  it("reports a citizenship or clearance bar regardless of sponsorship need", () => {
    for (const requiresSponsorship of [true, false]) {
      const clearance = scoreFit(
        digest({ requirements: ["Active security clearance required"] }),
        profile({ requiresSponsorship }),
      );
      expect(clearance.eligibilityBlocked?.kind).toBe("clearance");

      const citizen = scoreFit(
        digest({ requirements: ["Must be a US citizen"] }),
        profile({ requiresSponsorship }),
      );
      expect(citizen.eligibilityBlocked?.kind).toBe("citizenship");
    }
  });

  it("leaves the fit score untouched, so the skip reason stays the real one", () => {
    const blocked = scoreFit(
      restricted,
      profile({ techStack: ["react"], requiresSponsorship: true }),
    );
    const open = scoreFit(
      restricted,
      profile({ techStack: ["react"], requiresSponsorship: false }),
    );
    // Ineligibility is reported, not disguised as a low score the user would try to fix.
    expect(blocked.score).toBe(open.score);
  });

  it("does not flag a posting that is merely silent on eligibility", () => {
    const result = scoreFit(
      digest({ techStack: ["react"], descriptionExcerpt: "Senior React engineer. Remote." }),
      profile({ requiresSponsorship: true }),
    );
    expect(result.eligibilityBlocked).toBeUndefined();
  });

  it("reads requirements and responsibilities, not just the excerpt", () => {
    const result = scoreFit(
      digest({ responsibilities: ["No visa sponsorship is available."] }),
      profile({ requiresSponsorship: true }),
    );
    expect(result.eligibilityBlocked?.kind).toBe("sponsorship");
  });
});
