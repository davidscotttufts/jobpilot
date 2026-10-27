import {
  JOB_ALERT_SENDER_DOMAINS,
  nextDailyRun,
  type PilotJobAlerts,
  pilotInstructionsConfigSchema,
} from "@jobpilot/contracts/pilot";
import { pilotChannel } from "@jobpilot/contracts/sse";
import { inject, injectable } from "@needle-di/core";
import { toInputJson } from "@/common/json";
import { publish } from "@/common/sse";
import { PrismaClient } from "@/generated/prisma/client";
import { EmailSyncService } from "@/modules/email/sync/sync.service";
import { PilotService } from "./pilot.service";
import { hasPendingRunNow, pendingJobAlertsWhere } from "./tasks/gather-inbox";
import { TASK_LIST_SNAPSHOT_RESET } from "./tasks/snapshot";

/** A run-now click syncs first so the count is current, but never re-pulls a mailbox just synced. */
const RUN_NOW_SYNC_STALE_MS = 2 * 60 * 1000;

@injectable()
export class JobAlertsService {
  constructor(
    private readonly prisma: PrismaClient = inject(PrismaClient),
    private readonly emailSync = inject(EmailSyncService),
    private readonly pilot = inject(PilotService),
  ) {}

  private async loadConfig(userId: string) {
    const row = await this.prisma.pilotState.findUnique({
      where: { userId },
      select: { instructionsConfig: true },
    });
    return pilotInstructionsConfigSchema.parse(row?.instructionsConfig ?? {});
  }

  async getStatus(userId: string) {
    const now = new Date();
    const [config, state, lastRun, account] = await Promise.all([
      this.loadConfig(userId),
      this.prisma.pilotState.findUnique({
        where: { userId },
        select: { running: true, jobAlertsRequestedAt: true },
      }),
      this.prisma.pilotRun.findFirst({
        where: { userId, taskType: "inbox.jobAlerts" },
        orderBy: { startedAt: "desc" },
        select: {
          startedAt: true,
          finishedAt: true,
          outcome: true,
          subjectType: true,
          subjectId: true,
        },
      }),
      this.prisma.emailAccount.findUnique({ where: { userId }, select: { id: true } }),
    ]);
    const settings = config.jobAlerts;

    const [pendingEmails, campaign] = await Promise.all([
      this.prisma.emailMessage.count({ where: pendingJobAlertsWhere(userId, settings, now) }),
      // The run's result names the campaign it opened.
      lastRun?.subjectType === "campaign"
        ? this.prisma.campaign.findFirst({
            where: { id: lastRun.subjectId, userId },
            select: { id: true, query: true },
          })
        : null,
    ]);

    const requestedAt = state?.jobAlertsRequestedAt ?? null;
    return {
      settings,
      builtInSenderDomains: [...JOB_ALERT_SENDER_DOMAINS],
      pilotRunning: state?.running ?? false,
      mailboxConnected: account !== null,
      pendingEmails,
      nextRunAt: settings.enabled ? nextDailyRun(settings.runHours, settings.timeZone, now) : null,
      requestedAt: hasPendingRunNow(requestedAt, lastRun, now) ? requestedAt : null,
      lastRun: lastRun
        ? {
            startedAt: lastRun.startedAt,
            finishedAt: lastRun.finishedAt,
            outcome: lastRun.outcome,
            campaignId: campaign?.id ?? null,
            campaignQuery: campaign?.query ?? null,
          }
        : null,
    };
  }

  /** Edits only the import block, so it never races the instructions editor's other fields. */
  async updateSettings(userId: string, settings: PilotJobAlerts) {
    const config = await this.loadConfig(userId);
    const instructionsConfig = toInputJson({ ...config, jobAlerts: settings });
    await this.prisma.pilotState.upsert({
      where: { userId },
      create: { userId, instructionsConfig },
      update: {
        instructionsConfig,
        instructionsUpdatedAt: new Date(),
        ...TASK_LIST_SNAPSHOT_RESET,
      },
    });
    await this.wakePilot(userId);
    return this.getStatus(userId);
  }

  async runNow(userId: string) {
    const now = new Date();
    await this.emailSync.syncIfStale(userId, RUN_NOW_SYNC_STALE_MS, now);
    const [config, state] = await Promise.all([
      this.loadConfig(userId),
      this.prisma.pilotState.findUnique({ where: { userId }, select: { running: true } }),
    ]);
    const pendingEmails = await this.prisma.emailMessage.count({
      where: pendingJobAlertsWhere(userId, config.jobAlerts, now),
    });
    const pilotRunning = state?.running ?? false;

    // Nothing to read: a queued request would sit until mail arrived and then fire unasked.
    if (pendingEmails === 0) {
      return { queued: false, pendingEmails, pilotRunning };
    }

    await this.prisma.pilotState.upsert({
      where: { userId },
      create: { userId, jobAlertsRequestedAt: now },
      update: { jobAlertsRequestedAt: now, ...TASK_LIST_SNAPSHOT_RESET },
    });
    await this.wakePilot(userId);
    return { queued: true, pendingEmails, pilotRunning };
  }

  /** The terminal host ends its idle sleep on `state.changed`, so the run starts in seconds. */
  private async wakePilot(userId: string) {
    const state = await this.pilot.getState(userId);
    publish(pilotChannel, { userId }, { type: "state.changed", state });
  }
}
