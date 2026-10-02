import { service } from "./fakes";
import { describe, expect, it } from "bun:test";

describe("TaskListService promotion cadence", () => {
  const instructionsConfig = { promotion: { platforms: [{ platform: "hn", postEveryDays: 30 }] } };
  const drafts = (taskList: { tasks: { taskType: string }[] }) =>
    taskList.tasks.some((i) => i.taskType === "promotion.draft");

  it("drafts for a platform with no post yet, and not after a recent one", async () => {
    expect(drafts(await service({ instructionsConfig }).refresh("p1"))).toBe(true);

    const recent = await service({
      instructionsConfig,
      platformPosts: [{ platform: "hn", createdAt: new Date() }],
    }).refresh("p1");
    expect(drafts(recent)).toBe(false);
  });
});
