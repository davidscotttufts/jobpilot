import { hasTaskType, service, serviceWithRec } from "./fakes";
import { describe, expect, it } from "bun:test";

describe("TaskListService campaign.scorePending", () => {
  const campaign = {
    campaignId: "c1",
    query: "react",
    config: { board: "linkedin", minScore: 70 },
    _count: { jobs: 9 },
    jobs: [{ key: "j1", url: "https://x/j1", title: "Engineer" }],
  };

  it("offers a campaign's unscored rows with its own board and threshold", async () => {
    const taskList = await service({ scorePendingCampaigns: [campaign] }).refresh("p1");
    const task = taskList.tasks.find((i) => i.taskType === "campaign.scorePending");
    expect(task?.subjectId).toBe("c1");
    expect(task?.payload).toMatchObject({ board: "linkedin", minScore: 70, pendingCount: 9 });
  });

  // An unscorable row stays pending forever and outranks discovery, so a recent run must hold it back.
  it("holds a campaign back while its last run is recent", async () => {
    const taskList = await service({
      scorePendingCampaigns: [campaign],
      scorePendingRuns: [{ subjectId: "c1", startedAt: new Date(), finishedAt: new Date() }],
    }).refresh("p1");
    expect(hasTaskType(taskList, "campaign.scorePending")).toBe(false);
  });

  // Gating on matchScore alone would leave a row scored off the results page without a brief.
  it("counts rows missing either a score or a brief", async () => {
    const { svc, rec } = serviceWithRec({ scorePendingCampaigns: [campaign] });
    await svc.refresh("p1");
    const gather = rec.campaignQueries.find(
      (where) => "jobs" in where && where.source === "auto_apply" && !("OR" in where),
    ) as { jobs: { some: unknown } };
    expect(gather.jobs.some).toEqual({
      status: "pending",
      OR: [{ matchScore: null }, { brief: null }],
    });
  });
});

describe("TaskListService campaign.reviewPaused", () => {
  const pausedAt = new Date(Date.now() - 60 * 60_000);
  const paused = { campaignId: "c9", query: "react", config: {}, updatedAt: pausedAt };
  const answeredAt = (offsetMs: number) => new Date(pausedAt.getTime() + offsetMs);

  it("offers a paused auto-apply campaign for review", async () => {
    const taskList = await service({ pausedCampaigns: [paused] }).refresh("p1");
    const task = taskList.tasks.find((i) => i.taskType === "campaign.reviewPaused");
    expect(task?.payload).toEqual({ campaignId: "c9", query: "react", board: null, pausedAt });
  });

  it("waits while the user has an open question or answered this pause", async () => {
    const open = await service({
      pausedCampaigns: [paused],
      campaignQuestions: [{ subjectId: "c9", status: "open", answeredAt: null }],
    }).refresh("p1");
    expect(hasTaskType(open, "campaign.reviewPaused")).toBe(false);

    const decided = await service({
      pausedCampaigns: [paused],
      campaignQuestions: [{ subjectId: "c9", status: "answered", answeredAt: answeredAt(60_000) }],
    }).refresh("p1");
    expect(hasTaskType(decided, "campaign.reviewPaused")).toBe(false);
  });

  it("asks again when the only answer predates the current pause", async () => {
    const taskList = await service({
      pausedCampaigns: [paused],
      campaignQuestions: [{ subjectId: "c9", status: "answered", answeredAt: answeredAt(-60_000) }],
    }).refresh("p1");
    expect(hasTaskType(taskList, "campaign.reviewPaused")).toBe(true);
  });

  it("holds a campaign back while its last review is recent", async () => {
    const taskList = await service({
      pausedCampaigns: [paused],
      pausedReviewRuns: [{ subjectId: "c9", startedAt: new Date(), finishedAt: null }],
    }).refresh("p1");
    expect(hasTaskType(taskList, "campaign.reviewPaused")).toBe(false);
  });
});

describe("TaskListService queue.score", () => {
  const RESUME_ID = "b0f1c2d3-4e5a-4b6c-8d7e-9f0a1b2c3d4e";
  const queued = {
    campaignId: "c1",
    config: { resumeId: RESUME_ID, minScore: 55 },
    _count: { jobs: 3 },
    jobs: [{ key: "q1", url: "https://x/1" }],
  };

  it("offers one batch per apply campaign holding pasted links", async () => {
    const taskList = await service({ queuedCampaigns: [queued] }).refresh("p1");
    const task = taskList.tasks.find((i) => i.taskType === "queue.score");
    expect(task?.payload).toEqual({
      campaignId: "c1",
      resumeId: RESUME_ID,
      minScore: 55,
      queuedCount: 3,
      entries: [{ key: "q1", url: "https://x/1" }],
    });
  });

  it("holds a campaign back while its last scoring run is still open", async () => {
    const taskList = await service({
      queuedCampaigns: [queued],
      queueScoreRuns: [{ subjectId: "c1", startedAt: new Date(), finishedAt: null }],
    }).refresh("p1");
    expect(hasTaskType(taskList, "queue.score")).toBe(false);
  });
});

describe("TaskListService campaign reviews", () => {
  // 40 found, 4 qualified, 36 skipped, 3 failed: past every review threshold.
  const laggard = {
    quietCampaigns: [
      {
        campaignId: "c1",
        query: "react",
        config: { minScore: 70, board: "linkedin" },
        source: "search",
      },
    ],
    quietJobCounts: [
      { campaignId: "c1", status: "applied", _count: { _all: 1 } },
      { campaignId: "c1", status: "skipped", _count: { _all: 36 } },
      { campaignId: "c1", status: "failed", _count: { _all: 3 } },
    ],
  };

  it("offers a tune, a rescan and a retry for a poorly converting campaign", async () => {
    const taskList = await service({
      ...laggard,
      skipReasonRows: [{ campaignId: "c1", skipReason: "overqualified", _count: { _all: 20 } }],
    }).refresh("p1");
    const payloadOf = (taskType: string) =>
      taskList.tasks.find((i) => i.taskType === taskType)?.payload;
    expect(payloadOf("campaign.tune")).toMatchObject({
      config: { minScore: 70, board: "linkedin" },
      counts: { totalFound: 40, qualified: 4, applied: 1, skipped: 36 },
      topSkipReasons: ["overqualified"],
    });
    expect(payloadOf("job.rescanSkipped")).toMatchObject({ skippedCount: 36 });
    expect(payloadOf("job.retryFailed")).toMatchObject({ failedCount: 3 });
  });

  it("skips a review journaled for the same campaign this week", async () => {
    const taskList = await service({
      ...laggard,
      actionMarkers: [
        { subjectId: "c1", detail: { type: "tune" } },
        { subjectId: "c1", detail: { type: "rescanSkipped" } },
        { subjectId: "other", detail: { type: "retryFailed" } },
      ],
    }).refresh("p1");
    expect(hasTaskType(taskList, "campaign.tune")).toBe(false);
    expect(hasTaskType(taskList, "job.rescanSkipped")).toBe(false);
    expect(hasTaskType(taskList, "job.retryFailed")).toBe(true);
  });
});

describe("TaskListService idle-campaign sweep", () => {
  it("completes an idle campaign server-side and journals it, with no task", async () => {
    const { svc, rec } = serviceWithRec({
      finalizeCampaigns: [{ campaignId: "c3", query: "react" }],
    });
    const taskList = await svc.refresh("p1");
    expect(rec.campaignUpdates).toHaveLength(1);
    expect(rec.campaignUpdates[0]).toMatchObject({
      where: { campaignId: "c3", status: "in_progress" },
      data: { status: "completed", statusActor: "pilot" },
    });
    expect(rec.journals).toContainEqual(
      expect.objectContaining({ kind: "action", subjectType: "campaign", subjectId: "c3" }),
    );
    expect(taskList.tasks.some((i) => i.subjectId === "c3")).toBe(false);
  });
});
