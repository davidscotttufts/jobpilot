import { type TaskList, taskListSchema } from "@jobpilot/contracts/pilot";
import { Prisma } from "@/generated/prisma/client";

/**
 * Drops the cached task list so the next fetch rebuilds it. Only config writes carry it
 * (instructions, searches, start/stop); job and inbox changes wait out the snapshot's TTL.
 */
export const TASK_LIST_SNAPSHOT_RESET = {
  taskListVersion: null,
  taskListExpiresAt: null,
  taskListSnapshot: Prisma.DbNull,
} as const;

export function parseTaskListSnapshot(value: unknown): TaskList {
  return taskListSchema.parse(value);
}
