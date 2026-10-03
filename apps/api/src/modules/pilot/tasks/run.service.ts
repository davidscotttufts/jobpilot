import {
  type FinishPilotRunInput,
  type PilotRun,
  type PilotRunResultInput,
  type PilotTask,
  pilotRunSchema,
  type ReportPilotUsageInput,
} from "@jobpilot/contracts/pilot";
import { pilotChannel } from "@jobpilot/contracts/sse";
import { singleton } from "tsyringe";
import { z } from "zod/v4";
import { conflict, findOwned } from "@/common/errors";
import { reviveJsonDates, toInputJson } from "@/common/json";
import { publish } from "@/common/sse";
import {
  type PilotRun as PilotRunModel,
  type Prisma,
  PrismaClient,
} from "@/generated/prisma/client";
import { guardApply, startApplying } from "@/modules/campaign/jobs/apply-guard";
import { publishJob } from "@/modules/campaign/jobs/job-events";
import { PilotJournalService } from "../journal.service";
import { NEEDS_WORKER_VISIT } from "./gather-campaigns";
import { parseJobRef, revertApplyingJobs } from "./runs";
import { parseTaskListSnapshot } from "./snapshot";

const RUN_TTL_MS = 15 * 60 * 1000;
/** Counted from `startedAt`, so a stuck driver that keeps heartbeating still expires. */
const MAX_RUN_LIFETIME_MS = 25 * 60 * 1000;
const STALE_TASK_LIST = "Task list is stale; refresh it before starting a run.";

const payloadSchema = z.record(z.string(), z.json());

function toPilotRun(row: PilotRunModel): PilotRun {
  return pilotRunSchema.parse({ ...row, payload: reviveJsonDates(row.payload) });
}

/** Task types whose row can change after the task list was built are re-checked rather than trusted. */
async function assertStillStartable(
  tx: Prisma.TransactionClient,
  userId: string,
  task: PilotTask,
): Promise<void> {
  const { subjectId } = task;
  let remaining: number;
  let gone: string;
  switch (task.taskType) {
    case "promotion.post":
      remaining = await tx.promotionPost.count({
        where: { id: subjectId, userId, status: "approved" },
      });
      gone = "Promotion post is no longer approved.";
      break;
    case "networking.send":
      remaining = await tx.networkingMessage.count({
        where: { id: subjectId, userId, status: "approved" },
      });
      gone = "Networking message is no longer approved.";
      break;
    case "campaign.reviewPaused":
      remaining = await tx.campaign.count({
        where: { campaignId: subjectId, userId, status: "paused" },
      });
      gone = "Campaign is no longer paused.";
      break;
    case "campaign.scorePending":
      remaining = await tx.campaign.count({
        where: {
          campaignId: subjectId,
          userId,
          status: "in_progress",
          jobs: { some: NEEDS_WORKER_VISIT },
        },
      });
      gone = "Campaign has no jobs left to score.";
      break;
    default:
      return;
  }
  if (remaining === 0) throw conflict(gone);
}

/** Starts tasks off a versioned task list snapshot, and keeps those runs alive or finishes them. */
@singleton()
export class RunService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly journal: PilotJournalService,
  ) {}

  async start(userId: string, taskListVersion: string, taskId: string) {
    const { run, startedJob } = await guardApply(this.prisma, userId, () =>
      this.prisma.$transaction((tx) =>
        this.startInTransaction(tx, userId, taskListVersion, taskId),
      ),
    );
    if (startedJob) publishJob(userId, startedJob, "updated");
    return toPilotRun(run);
  }

  private async startInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    taskListVersion: string,
    taskId: string,
  ) {
    const now = new Date();
    // The no-op write locks this user's state row, which serializes concurrent runs below.
    const [locked] = await tx.pilotState.updateManyAndReturn({
      where: { userId, running: true, taskListVersion, taskListExpiresAt: { gt: now } },
      data: { taskListVersion },
      select: { taskListSnapshot: true },
    });
    if (!locked?.taskListSnapshot) {
      const state = await tx.pilotState.findUnique({
        where: { userId },
        select: { running: true },
      });
      throw conflict(state?.running ? STALE_TASK_LIST : "Pilot is stopped.");
    }

    const task = parseTaskListSnapshot(locked.taskListSnapshot).tasks.find((i) => i.id === taskId);
    if (!task) throw conflict("Task is no longer available.");

    const open = await tx.pilotRun.findFirst({
      where: {
        userId,
        taskType: task.taskType,
        subjectType: task.subjectType,
        subjectId: task.subjectId,
        finishedAt: null,
      },
      select: { id: true },
    });
    if (open) throw conflict("This task is already started.");

    await assertStillStartable(tx, userId, task);
    const startedJob =
      task.taskType === "job.apply"
        ? await startApplying(tx, userId, task.payload.campaignId, task.payload.jobKey)
        : null;

    const run = await tx.pilotRun.create({
      data: {
        userId,
        taskType: task.taskType,
        subjectType: task.subjectType,
        subjectId: task.subjectId,
        payload: toInputJson(task.payload),
        expiresAt: new Date(now.getTime() + RUN_TTL_MS),
      },
    });
    return { run, startedJob };
  }

  async get(userId: string, id: string) {
    const run = await findOwned(
      (where) => this.prisma.pilotRun.findFirst({ where }),
      { id, userId },
      "Run",
    );
    return toPilotRun(run);
  }

  async heartbeat(userId: string, id: string) {
    const run = await findOwned(
      (where) =>
        this.prisma.pilotRun.findFirst({ where, select: { startedAt: true, finishedAt: true } }),
      { id, userId },
      "Run",
    );
    if (run.finishedAt) throw conflict("Run is already finished.");

    const now = Date.now();
    const ceiling = run.startedAt.getTime() + MAX_RUN_LIFETIME_MS;
    const [updated] = await this.prisma.pilotRun.updateManyAndReturn({
      where: { id, userId, finishedAt: null },
      data: {
        heartbeatAt: new Date(now),
        expiresAt: new Date(Math.min(now + RUN_TTL_MS, ceiling)),
      },
    });
    if (!updated) throw conflict("Run is already finished.");
    return toPilotRun(updated);
  }

  async reportUsage(userId: string, id: string, body: ReportPilotUsageInput) {
    await findOwned(
      (where) => this.prisma.pilotRun.findFirst({ where, select: { id: true } }),
      { id, userId },
      "Run",
    );
    return toPilotRun(await this.prisma.pilotRun.update({ where: { id }, data: body }));
  }

  /** Bookkeeping only: an abandoned apply goes back to approved, other results use their own routes. */
  async finish(userId: string, id: string, body: FinishPilotRunInput) {
    const existing = await findOwned(
      (where) => this.prisma.pilotRun.findFirst({ where }),
      { id, userId },
      "Run",
    );
    if (existing.finishedAt) {
      if (existing.outcome === body.outcome) return toPilotRun(existing);
      throw conflict(`Run already finished with outcome ${existing.outcome}.`);
    }

    const payload = payloadSchema.parse(existing.payload);
    const finished = await this.prisma.$transaction(async (tx) => {
      if (body.outcome === "abandoned" && existing.taskType === "job.apply") {
        await revertApplyingJobs(tx, userId, [parseJobRef(payload)]);
      }
      const [row] = await tx.pilotRun.updateManyAndReturn({
        where: { id, userId, finishedAt: null },
        data: {
          finishedAt: new Date(),
          outcome: body.outcome,
          payload: toInputJson(body.note ? { ...payload, finishNote: body.note } : payload),
        },
      });
      if (!row) throw conflict("Run was finished concurrently.");
      return row;
    });
    return toPilotRun(finished);
  }

  /** The run id is the journal cycleId, so the host's cycle entry for this run groups with it. */
  async postResult(userId: string, id: string, body: PilotRunResultInput) {
    const existing = await this.get(userId, id);
    if (existing.finishedAt) return existing;

    const run = await this.finish(userId, id, { outcome: body.outcome });
    const action = {
      kind: "action" as const,
      summary: body.summary,
      subjectType: body.subjectType ?? run.subjectType,
      subjectId: body.subjectId ?? run.subjectId,
      detail: body.detail,
    };
    const hints = body.hints.map((hint) => ({
      kind: "hint" as const,
      summary: hint.text,
      subjectType: "board",
      subjectId: hint.domain,
    }));
    await this.journal.appendJournal(userId, { cycleId: id, entries: [action, ...hints] });
    publish(pilotChannel, { userId }, { type: "run.finished", runId: id, outcome: body.outcome });
    return run;
  }
}
