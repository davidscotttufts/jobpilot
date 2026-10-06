import type { PilotTask } from "@jobpilot/contracts/pilot";
import { buildTaskList } from "./build";
import { base, cfg, job } from "./builders";
import { describe, expect, it } from "bun:test";

const applyTasks = (tasks: PilotTask[]) =>
  tasks.filter((task) => task.taskType === "job.apply" || task.taskType === "job.applyBatch");

const batchKeys = (task: PilotTask | undefined) =>
  task?.taskType === "job.applyBatch" ? task.payload.jobs.map((entry) => entry.jobKey) : [];

const threeJobs = [job("j1", 90), job("j2", 80), job("j3", 70)];

describe("buildTaskList apply batches", () => {
  it("keeps one task per job at the default of one concurrent apply", () => {
    const { tasks } = buildTaskList(base({ approvedJobs: threeJobs }));
    expect(applyTasks(tasks).map((task) => task.taskType)).toEqual([
      "job.apply",
      "job.apply",
      "job.apply",
    ]);
  });

  it("batches the best jobs up to the concurrency limit", () => {
    const config = cfg({ maxConcurrentApplies: 2 });
    const { tasks, budget } = buildTaskList(base({ config, approvedJobs: threeJobs }));
    const applies = applyTasks(tasks);
    expect(applies).toHaveLength(1);
    expect(batchKeys(applies[0])).toEqual(["j1", "j2"]);
    expect(applies[0].priority).toBe(890);
    expect(budget.maxConcurrentApplies).toBe(2);
  });

  it("shrinks the batch to the daily cap left, counting applies in flight", () => {
    const config = cfg({ maxConcurrentApplies: 3, dailyApplyCap: 5 });
    const input = base({ config, approvedJobs: threeJobs, appliedToday: 2, applyingNow: 1 });
    expect(batchKeys(applyTasks(buildTaskList(input).tasks)[0])).toEqual(["j1", "j2"]);
  });

  it("falls back to single applies when only one slot is free", () => {
    const config = cfg({ maxConcurrentApplies: 2 });
    const input = base({ config, approvedJobs: threeJobs, applyingNow: 1 });
    expect(applyTasks(buildTaskList(input).tasks).map((task) => task.taskType)).toEqual([
      "job.apply",
      "job.apply",
      "job.apply",
    ]);
  });

  it("does not batch a single approved job", () => {
    const config = cfg({ maxConcurrentApplies: 3 });
    const { tasks } = buildTaskList(base({ config, approvedJobs: [job("j1", 90)] }));
    expect(applyTasks(tasks).map((task) => task.taskType)).toEqual(["job.apply"]);
  });
});
