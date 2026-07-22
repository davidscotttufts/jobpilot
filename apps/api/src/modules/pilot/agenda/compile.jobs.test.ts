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

describe("AgendaService discover campaign reuse", () => {
  const oneSearch = { savedSearches: [{ query: "react" }] };

  const discoverPayload = (agenda: { items: { kind: string; payload: unknown }[] }) =>
    agenda.items.find((i) => i.kind === "search.discover")?.payload as
      | { campaignId?: string }
      | undefined;

  it("carries the existing in-progress campaign for the query", async () => {
    const agenda = await service({
      instructionsConfig: oneSearch,
      dueQueryCampaigns: [{ campaignId: "c-old", query: "react" }],
    }).refresh("p1");
    expect(discoverPayload(agenda)?.campaignId).toBe("c-old");
  });

  it("prefers the newest campaign when several match the query", async () => {
    const agenda = await service({
      instructionsConfig: oneSearch,
      // The gather orders by startedAt asc, so the later row is the newest and wins the overwrite.
      dueQueryCampaigns: [
        { campaignId: "c-old", query: "react" },
        { campaignId: "c-new", query: "react" },
      ],
    }).refresh("p1");
    expect(discoverPayload(agenda)?.campaignId).toBe("c-new");
  });

  it("omits campaignId when no in-progress campaign matches", async () => {
    const agenda = await service({ instructionsConfig: oneSearch }).refresh("p1");
    const payload = discoverPayload(agenda);
    expect(payload).toBeDefined();
    expect(payload?.campaignId).toBeUndefined();
  });
});
