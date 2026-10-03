import {
  currentTaskListSchema,
  finishPilotRunSchema,
  pilotRunSchema,
  reportPilotUsageSchema,
  startPilotRunSchema,
  taskListSchema,
} from "@jobpilot/contracts/pilot";
import { idParam } from "@jobpilot/contracts/shared";
import { Elysia } from "elysia";
import { z } from "zod/v4";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { RATE_LIMITS, rateLimit } from "@/common/rate-limit";
import { RunService } from "./run.service";
import { TaskListService } from "./task-list.service";

const taskList = container.resolve(TaskListService);
const runs = container.resolve(RunService);
const limitTaskList = rateLimit(RATE_LIMITS.pilotTasks);
const limitRun = rateLimit(RATE_LIMITS.pilotRun);

export const pilotTasksController = new Elysia({ prefix: "/pilot", detail: { tags: ["Pilot"] } })
  .use(authGuard)
  .get("/tasks", ({ user }) => taskList.getCurrent(user.id), {
    beforeHandle: limitTaskList,
    response: currentTaskListSchema,
    detail: {
      summary: "Get the current task list",
      description:
        "Returns the current unexpired task list snapshot without running expiry, promotion, digest, or any other mutation.",
    },
  })
  .post("/tasks/refresh", ({ user }) => taskList.refresh(user.id), {
    beforeHandle: limitTaskList,
    response: taskListSchema,
    detail: {
      summary: "Refresh the task list",
      description:
        "Runs lifecycle maintenance, builds a typed task list, persists a new expiring version, and returns that snapshot.",
    },
  })
  .post("/runs", ({ user, body }) => runs.start(user.id, body.taskListVersion, body.taskId), {
    body: startPilotRunSchema,
    beforeHandle: limitRun,
    response: pilotRunSchema,
    detail: {
      summary: "Start a task run",
      description:
        "Atomically starts a task from the supplied task list version and creates its 15-minute run; stale versions and races return 409.",
    },
  })
  .post("/runs/:id/heartbeat", ({ user, params }) => runs.heartbeat(user.id, params.id), {
    params: idParam,
    beforeHandle: limitRun,
    response: pilotRunSchema,
    detail: {
      summary: "Heartbeat a run",
      description: "Extends the run TTL by 15 minutes and records the heartbeat.",
    },
  })
  .post("/runs/:id/finish", ({ user, params, body }) => runs.finish(user.id, params.id, body), {
    params: idParam,
    body: finishPilotRunSchema,
    beforeHandle: limitRun,
    response: pilotRunSchema,
    detail: {
      summary: "Finish a run",
      description:
        "Closes a run (done/failed/abandoned); abandoned reverts the job to approved. Bookkeeping only - terminal job results go through the campaign result route.",
    },
  })
  .post("/usage", ({ user, body }) => runs.reportUsage(user.id, body), {
    body: reportPilotUsageSchema,
    beforeHandle: limitRun,
    response: z.object({ runId: z.uuid().nullable() }),
    detail: {
      summary: "Report a cycle's token usage",
      description:
        "The host posts the cycle's measured usage and the server attaches it to the run that cycle started (the newest run started within the last cycleSeconds). A cycle that started no run returns runId null and stores nothing.",
    },
  });
