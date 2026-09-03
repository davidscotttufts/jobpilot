import type {
  CreatePilotSearchInput,
  PilotSearchCadence,
  ReportPilotSearchRunInput,
  UpdatePilotSearchInput,
} from "@jobpilot/contracts/pilot";
import { isPinnedWeekly, nextWeeklyRun } from "@jobpilot/contracts/pilot";
import { singleton } from "tsyringe";
import { conflict, findOwned } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma/client";
import {
  EMPTY_RUN_BACKOFF_MS,
  GOOD_RUN_NEW_JOBS,
  RERUN_GOOD_SEARCH_MS,
  RERUN_SLOW_SEARCH_MS,
} from "./agenda/constants";
import { AGENDA_SNAPSHOT_RESET } from "./agenda/snapshot";

/** The cadence half of a search row - everything the next-run policy reads besides the run itself. */
export interface SearchCadence {
  cadence: PilotSearchCadence;
  cadenceDays: number[];
  cadenceHour: number;
  cadenceTimeZone: string;
}

export interface ScheduleRunInput extends SearchCadence {
  /** Consecutive empty runs recorded *before* this run. */
  emptyRuns: number;
  jobsSeen: number;
  newJobs: number;
  reachedEnd: boolean;
  now: Date;
}

export interface ScheduleRunResult {
  emptyRuns: number;
  nextRunAt: Date;
  lastRunAt: Date;
  lastJobsSeen: number;
  lastNewJobs: number;
}

/**
 * Pure next-run policy for one discovery run.
 *
 * A weekly search goes to its next pinned day, full stop - a user who asked for Mondays does not
 * want a good yield pulling it forward to Tuesday, nor a dry week pushing it to Thursday. An
 * adaptive one keeps the original behaviour: still-yielding re-runs soon, dry backs off up the
 * 8h/24h/48h ladder. `emptyRuns` is tracked either way; weekly only stops it steering the date.
 */
export function scheduleNextRun(input: ScheduleRunInput): ScheduleRunResult {
  const { emptyRuns, jobsSeen, newJobs, reachedEnd, now } = input;
  const at = (ms: number) => new Date(now.getTime() + ms);
  const pinned = isPinnedWeekly(input)
    ? nextWeeklyRun(input.cadenceDays, input.cadenceHour, input.cadenceTimeZone, now)
    : null;
  const base = { lastRunAt: now, lastJobsSeen: jobsSeen, lastNewJobs: newJobs };

  if (newJobs === 0) {
    // Step up the backoff ladder, holding at its last rung.
    const next = emptyRuns + 1;
    const rung = EMPTY_RUN_BACKOFF_MS[Math.min(next - 1, EMPTY_RUN_BACKOFF_MS.length - 1)];
    return { ...base, emptyRuns: next, nextRunAt: pinned ?? at(rung) };
  }

  const stillYielding = newJobs >= GOOD_RUN_NEW_JOBS && !reachedEnd;
  return {
    ...base,
    emptyRuns: 0,
    nextRunAt: pinned ?? at(stillYielding ? RERUN_GOOD_SEARCH_MS : RERUN_SLOW_SEARCH_MS),
  };
}

/**
 * When a freshly pinned search should first come due, or null to leave `nextRunAt` alone.
 *
 * A weekly search saved on Tuesday for Mondays must wait for Monday; an adaptive one keeps the
 * default of "now", which is what makes a brand-new search run on the next cycle.
 */
function scheduleStart(input: UpdatePilotSearchInput, now = new Date()): Date | null {
  if (input.cadence !== "weekly" || !input.cadenceDays?.length) {
    return null;
  }
  return nextWeeklyRun(
    input.cadenceDays,
    input.cadenceHour ?? 8,
    input.cadenceTimeZone ?? "UTC",
    now,
  );
}

/** Owns the pilot's self-managed searches: CRUD plus applying a run's result to its schedule. */
@singleton()
export class PilotSearchService {
  constructor(private readonly prisma: PrismaClient) {}

  /** A search mutation invalidates the cached agenda, same as an instructions edit. */
  private nullAgenda(userId: string) {
    return this.prisma.pilotState.updateMany({ where: { userId }, data: AGENDA_SNAPSHOT_RESET });
  }

  /**
   * A plain DB unique on (userId, query, board) would treat two NULL boards as distinct, and an
   * expression index on COALESCE(board, '') is not expressible in schema.prisma - it would read as
   * permanent drift. So the check lives here; the pilot is the only writer, so a losing race is a
   * duplicate search, not corruption.
   */
  private async assertUnique(
    userId: string,
    query: string,
    board: string | null,
    excludeId?: string,
  ) {
    const clash = await this.prisma.pilotSearch.findFirst({
      where: { userId, query, board, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (clash) throw conflict("A search with this query and board already exists.");
  }

  list(userId: string) {
    return this.prisma.pilotSearch.findMany({ where: { userId }, orderBy: { nextRunAt: "asc" } });
  }

  async create(userId: string, input: CreatePilotSearchInput) {
    const board = input.board ?? null;
    await this.assertUnique(userId, input.query, board);
    const firstRun = scheduleStart(input);
    const row = await this.prisma.pilotSearch.create({
      data: {
        userId,
        query: input.query,
        board,
        resumeId: input.resumeId ?? null,
        reason: input.reason,
        minScore: input.minScore ?? null,
        maxApplications: input.maxApplications ?? null,
        ...this.cadenceData(input),
        // A pinned search waits for its first real day rather than firing the moment it is saved.
        ...(firstRun ? { nextRunAt: firstRun } : {}),
      },
    });
    if (input.campaignId) {
      await this.adoptCampaign(userId, input.campaignId, row.id);
    }
    await this.nullAgenda(userId);
    return row;
  }

  /**
   * Points an existing campaign at the search now repeating it.
   *
   * Discovery reuses a search's *in-progress* campaign, so adopting one stops the first scheduled
   * run opening a duplicate alongside it; adopting a finished campaign changes no behaviour and is
   * what lets its row show that it repeats. `updateMany` is the ownership guard: a campaign that
   * is not this user's matches nothing.
   */
  private adoptCampaign(userId: string, campaignId: string, searchId: string) {
    return this.prisma.campaign.updateMany({
      where: { campaignId, userId, pilotSearchId: null },
      data: { pilotSearchId: searchId },
    });
  }

  /** Schedule columns for a create/update patch; an omitted field stays Prisma's "unchanged". */
  private cadenceData(input: UpdatePilotSearchInput) {
    return {
      cadence: input.cadence,
      cadenceDays: input.cadenceDays,
      cadenceHour: input.cadenceHour,
      cadenceTimeZone: input.cadenceTimeZone,
    };
  }

  async update(userId: string, id: string, input: UpdatePilotSearchInput) {
    const existing = await findOwned(
      (where) => this.prisma.pilotSearch.findFirst({ where }),
      { id, userId },
      "Search",
    );

    const nextQuery = input.query ?? existing.query;
    const nextBoard = input.board !== undefined ? input.board : existing.board;
    const scheduleReset = nextQuery !== existing.query || nextBoard !== existing.board;
    if (scheduleReset) await this.assertUnique(userId, nextQuery, nextBoard, id);

    // The pin as it stands after this patch: the fields it sets, over the row's current ones.
    const nextPin = scheduleStart({
      cadence: input.cadence ?? existing.cadence,
      cadenceDays: input.cadenceDays ?? existing.cadenceDays,
      cadenceHour: input.cadenceHour ?? existing.cadenceHour,
      cadenceTimeZone: input.cadenceTimeZone ?? existing.cadenceTimeZone,
    });
    const touchesSchedule =
      input.cadence !== undefined ||
      input.cadenceDays !== undefined ||
      input.cadenceHour !== undefined ||
      input.cadenceTimeZone !== undefined;
    const repinned = touchesSchedule ? nextPin : null;

    const row = await this.prisma.pilotSearch.update({
      where: { id },
      // An undefined field is Prisma's "leave unchanged", which is exactly the patch semantics.
      data: {
        query: input.query,
        board: input.board,
        resumeId: input.resumeId,
        reason: input.reason,
        minScore: input.minScore,
        maxApplications: input.maxApplications,
        ...this.cadenceData(input),
        // Editing the schedule re-aims the next run; leaving it alone must not move the date.
        ...(repinned ? { nextRunAt: repinned } : {}),
        // A different query/board is a different search: restart its scheduling from now - except
        // under a pin, where "from now" would drag a Monday search onto whatever day this is.
        ...(scheduleReset
          ? {
              emptyRuns: 0,
              lastJobsSeen: null,
              lastNewJobs: null,
              ...(nextPin ? {} : { nextRunAt: new Date() }),
            }
          : {}),
      },
    });
    await this.nullAgenda(userId);
    return row;
  }

  async remove(userId: string, id: string) {
    await findOwned(
      (where) => this.prisma.pilotSearch.findFirst({ where, select: { id: true } }),
      { id, userId },
      "Search",
    );
    await this.prisma.pilotSearch.delete({ where: { id } });
    await this.nullAgenda(userId);
    return { deleted: id };
  }

  async reportRun(userId: string, id: string, input: ReportPilotSearchRunInput) {
    const existing = await findOwned(
      (where) =>
        this.prisma.pilotSearch.findFirst({
          where,
          select: {
            emptyRuns: true,
            cadence: true,
            cadenceDays: true,
            cadenceHour: true,
            cadenceTimeZone: true,
          },
        }),
      { id, userId },
      "Search",
    );
    const schedule = scheduleNextRun({ ...existing, now: new Date(), ...input });
    const row = await this.prisma.pilotSearch.update({ where: { id }, data: schedule });
    await this.nullAgenda(userId);
    return row;
  }
}
