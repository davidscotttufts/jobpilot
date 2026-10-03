import {
  currentTaskListSchema,
  finishPilotRunSchema,
  pilotRunResultSchema,
  pilotRunSchema,
  reportPilotUsageSchema,
  startPilotRunSchema,
  taskListSchema,
} from "@jobpilot/contracts/pilot";
import { idParam } from "@jobpilot/contracts/shared";
import { Elysia } from "elysia";
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
  .get("/runs/:id", ({ user, params }) => runs.get(user.id, params.id), {
    params: idParam,
    beforeHandle: limitRun,
    response: pilotRunSchema,
    detail: {
      summary: "Get a run",
      description:
        "Returns one run with its task type and payload. The agent reads its task from here; the host polls it to see the run finish.",
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
  .post("/runs/:id/result", ({ user, params, body }) => runs.postResult(user.id, params.id, body), {
    params: idParam,
    body: pilotRunResultSchema,
    beforeHandle: limitRun,
    response: pilotRunSchema,
    detail: {
      summary: "Post a run's result",
      description:
        "The agent's last step: journals the action line, finishes the run with its outcome, and publishes run.finished. A repeat post for a finished run returns it unchanged, so a retry after a lost response is safe.",
    },
  })
  .post("/runs/:id/usage", ({ user, params, body }) => runs.reportUsage(user.id, params.id, body), {
    params: idParam,
    body: reportPilotUsageSchema,
    beforeHandle: limitRun,
    response: pilotRunSchema,
    detail: {
      summary: "Report a run's token usage",
      description:
        "The host posts the token usage it measured from the provider CLI's telemetry while the run was handed to the agent.",
    },
  });
