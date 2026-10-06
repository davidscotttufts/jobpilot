import { DAY_MS } from "@/common/date/buckets";
import {
  APPLIED_AT,
  OTHER_USERS_VARIANT_ID,
  OWNED_RESUME_ID,
  OWNED_VARIANT_ID,
  setup,
} from "./fakes";
import { describe, expect, it } from "bun:test";

describe("CampaignJobService terminal results", () => {
  it("atomically records an application and its first event", async () => {
    const state = setup();
    const result = await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
    });
    expect(result.campaignJob.status).toBe("applied");
    expect(result.application).toMatchObject({
      events: { create: { kind: "status_change", toStatus: "applied", source: "campaign" } },
    });
    expect(result.summary).toMatchObject({ kind: "jobs", applied: 1 });
  });

  it("records the reported variant as the resume the application went out with", async () => {
    const state = setup();
    const result = await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
      resumeVariantId: OWNED_VARIANT_ID,
    });
    // The variant's own resumeId wins, so the pair can never disagree.
    expect(result.application).toMatchObject({
      resumeId: OWNED_RESUME_ID,
      resumeVariantId: OWNED_VARIANT_ID,
    });
    // Marks it used for the resume page's prune filter, without stealing an existing link.
    expect(state.variantLinks).toHaveLength(1);
    expect(state.variantLinks[0]).toMatchObject({
      where: { id: OWNED_VARIANT_ID, applicationId: null },
      data: { applicationId: "app1" },
    });
  });

  it("records a base resume submitted without tailoring", async () => {
    const state = setup();
    const result = await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
      resumeId: OWNED_RESUME_ID,
    });
    expect(result.application).toMatchObject({
      resumeId: OWNED_RESUME_ID,
      resumeVariantId: null,
    });
    expect(state.variantLinks).toHaveLength(0);
  });

  it("drops resume ids the user does not own", async () => {
    const state = setup();
    const result = await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
      resumeVariantId: OTHER_USERS_VARIANT_ID,
    });
    expect(result.application).toMatchObject({ resumeId: null, resumeVariantId: null });
    expect(state.variantLinks).toHaveLength(0);
  });

  it("records no resume when the agent reported none", async () => {
    const state = setup();
    const result = await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
    });
    expect(result.application).toMatchObject({ resumeId: null, resumeVariantId: null });
    expect(state.variantLinks).toHaveLength(0);
  });

  it("links the job's cover letter to the new application", async () => {
    const state = setup();
    await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
    });
    // The letter is written before the application row exists, so the url is the only link it has.
    expect(state.coverLetterLinks).toHaveLength(1);
    expect(state.coverLetterLinks[0]).toMatchObject({
      where: { jobUrl: "https://example.test/jobs/1", applicationId: null, userId: "u1" },
      data: { applicationId: "app1" },
    });
  });

  it("does not link documents when the job was not applied to", async () => {
    const state = setup();
    await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "skipped",
      skipReason: "Already applied (url)",
    });
    expect(state.variantLinks).toHaveLength(0);
    expect(state.coverLetterLinks).toHaveLength(0);
  });

  // `@@unique([userId, url])` reuses the first row; a frozen date drops that url out of the
  // duplicate window for good.
  it("advances the applied date when a repost lands on an existing application", async () => {
    const state = setup();
    state.setApplication({
      id: "app1",
      url: "https://example.test/jobs/1",
      appliedAt: new Date(Date.now() - 200 * DAY_MS),
    });

    const result = await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
    });

    expect(result.application).toMatchObject({
      appliedAt: new Date(APPLIED_AT),
      events: { create: { kind: "status_change", toStatus: "applied", source: "campaign" } },
    });
  });

  it("returns the same result idempotently without a second application upsert", async () => {
    const state = setup();
    const input = { outcome: "applied" as const, appliedAt: APPLIED_AT };
    await state.service.recordJobResult("u1", "c1", "j1", input);
    await state.service.recordJobResult("u1", "c1", "j1", input);
    expect(state.applicationUpserts).toBe(1);
  });

  it("rejects a different outcome after the job is terminal", async () => {
    const state = setup();
    await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "failed",
      failReason: "blocked",
    });
    await expect(
      state.service.recordJobResult("u1", "c1", "j1", {
        outcome: "skipped",
        skipReason: "duplicate",
      }),
    ).rejects.toThrow("already finished");
  });

  it("does not allow PATCH to rewrite an applied job", async () => {
    const state = setup();
    await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
    });
    await expect(
      state.service.patchJob("u1", "c1", "j1", { description: "late edit" }),
    ).rejects.toThrow("Terminal jobs cannot be edited");
  });

  it("retries a failed job only through the explicit retry command", async () => {
    const state = setup();
    await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "failed",
      failReason: "timeout",
    });
    const retried = await state.service.retryJob("u1", "c1", "j1", {
      retryNotes: "Try after login refresh",
    });
    expect(retried).toMatchObject({
      status: "approved",
      failReason: null,
      retryNotes: "Try after login refresh",
    });
  });

  it("rescans a skipped job only through the explicit rescan command", async () => {
    const state = setup();
    await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "skipped",
      skipReason: "Old score",
    });
    const rescanned = await state.service.rescanJob("u1", "c1", "j1", {
      decision: "approved",
      matchScore: 88,
      matchReason: "Fresh posting supports the match",
    });
    expect(rescanned).toMatchObject({
      status: "approved",
      matchScore: 88,
      skipReason: null,
    });
  });
});

// Claim timings show that an apply took five minutes and nothing about where they went; the worker
// is the only observer that can see inside one.
describe("CampaignJobService phase timings", () => {
  it("stores what the worker reported", async () => {
    const state = setup();

    const result = await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
      phases: { navigate: 4200, fill: 48000, submit: 9100 },
    });

    expect(result.campaignJob).toMatchObject({
      phaseTimings: { navigate: 4200, fill: 48000, submit: 9100 },
    });
  });

  it("does not send an empty object, which would erase a previous attempt's numbers", async () => {
    const state = setup();

    await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "failed",
      failReason: "blocked",
      // What a worker using the wrong key names produces: Zod strips them, leaving {} - truthy,
      // and previously written straight over real timings.
      phases: {},
    });

    expect(state.lastResultWrite()?.phaseTimings).toBeUndefined();
  });

  it("clears the submit stamp once an outcome is recorded", async () => {
    const state = setup();
    state.setSubmitAttempted(new Date());

    await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "failed",
      failReason: "blocked",
    });

    expect(state.job.submitAttemptedAt).toBeNull();
  });
});

describe("CampaignJobService submitted answers", () => {
  it("records what the agent put in the form on the application", async () => {
    const state = setup();

    const result = await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
      answers: [{ label: "Desired salary", value: "Negotiable" }],
    });

    expect(result.application).toMatchObject({
      submittedAnswers: [{ label: "Desired salary", value: "Negotiable" }],
    });
  });

  it("leaves the column unset when the agent reported none", async () => {
    const state = setup();

    const result = await state.service.recordJobResult("u1", "c1", "j1", {
      outcome: "applied",
      appliedAt: APPLIED_AT,
      answers: [],
    });

    expect(result.application).not.toHaveProperty("submittedAnswers");
  });
});
