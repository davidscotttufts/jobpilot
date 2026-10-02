import { type TaskList, taskListSchema } from "@jobpilot/contracts/pilot";
import { reviveJsonDates } from "@/common/json";
import { Prisma } from "@/generated/prisma/client";

/** Every write that changes a task list input carries this, or the agent works from a stale task list. */
export const TASK_LIST_SNAPSHOT_RESET = {
  taskListVersion: null,
  taskListBuiltAt: null,
  taskListExpiresAt: null,
  taskListSnapshot: Prisma.DbNull,
} as const;

export function parseTaskListSnapshot(value: unknown): TaskList {
  return taskListSchema.parse(reviveJsonDates(value));
}
