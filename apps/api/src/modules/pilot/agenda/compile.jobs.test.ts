// Apply-pipeline gathers through AgendaService.refresh (fake Prisma, no DB): the warm-check
// contact join and parked-board enforcement.

import { service } from "./compile.test-helpers";
import { approvedJob } from "./db.test-helpers";
import { describe, expect, it } from "bun:test";

describe("AgendaService warm-check join", () => {
  const insider = {
    id: "ct1",
    name: "Insider",
    title: "Staff Eng",
    email: "in@acme.test",
    company: "Acme, Inc.",
  };

  it("attaches same-company contacts and emits a warmIntro for a >=85 job", async () => {
    const agenda = await service({
      approvedJobs: [approvedJob({ matchScore: 90, company: "Acme" })],
      contacts: [insider],
    }).refresh("p1");
    const warm = agenda.items.find((i) => i.kind === "networking.warmIntro");
    const warmContacts = warm?.payload.contacts as { id: string }[] | undefined;
    expect(warmContacts?.[0].id).toBe("ct1");
    const apply = agenda.items.find((i) => i.kind === "job.apply");
    const applyWarm = apply?.payload.warmContacts as { id: string }[] | undefined;
    expect(applyWarm?.[0].id).toBe("ct1");
  });

  it("does not emit a warmIntro below the score threshold", async () => {
    const agenda = await service({
      approvedJobs: [approvedJob({ matchScore: 84, company: "Acme" })],
      contacts: [insider],
    }).refresh("p1");
    expect(agenda.items.some((i) => i.kind === "networking.warmIntro")).toBe(false);
  });
});

describe("AgendaService parkedBoards enforcement", () => {
  const parked = {
    parkedBoards: ["linkedin"],
    savedSearches: [
      { query: "react", board: "linkedin" },
      { query: "golang", board: "indeed" },
    ],
  };

  it("excludes approved jobs on a parked board from job.apply", async () => {
    const agenda = await service({
      instructionsConfig: parked,
      approvedJobs: [
        approvedJob({ key: "on-parked", board: "linkedin" }),
        approvedJob({ key: "on-live", board: "indeed" }),
      ],
    }).refresh("p1");
    const applyKeys = agenda.items.filter((i) => i.kind === "job.apply").map((i) => i.subjectId);
    expect(applyKeys).toEqual(["on-live"]);
  });

  it("excludes saved searches on a parked board from search.discover", async () => {
    const agenda = await service({ instructionsConfig: parked }).refresh("p1");
    const discovered = agenda.items
      .filter((i) => i.kind === "search.discover")
      .map((i) => (i.payload as { query: string }).query);
    expect(discovered).toEqual(["golang"]);
  });
});
