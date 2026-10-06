import {
  type CreatePilotSearchInput,
  isPinnedWeekly,
  nextWeeklyRun,
  type PilotSearchCadence,
  type ReportPilotSearchRunInput,
  type UpdatePilotSearchInput,
} from "@jobpilot/contracts/pilot";
import { singleton } from "tsyringe";
import { HOUR_MS } from "@/common/date/buckets";
import { conflict, findOwned } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma/client";
import { TASK_LIST_SNAPSHOT_RESET } from "./tasks/snapshot";

/** A run with this many new jobs is "good": re-run it soon while the board is yielding. */
const GOOD_RUN_NEW_JOBS = 3;
const RERUN_GOOD_SEARCH_MS = 2 * HOUR_MS;
/** A thin run, or a good one that reached the board's end. */
const RERUN_SLOW_SEARCH_MS = 8 * HOUR_MS;
/** Consecutive empty runs climb this ladder and hold on its last rung. */
const EMPTY_RUN_BACKOFF_MS = [8 * HOUR_MS, 24 * HOUR_MS, 48 * HOUR_MS];

/** The schedule columns of a search row. */
export interface SearchCadence {
  cadence: PilotSearchCadence;
  cadenceDays: number[];
  cadenceHour: number;
  cadenceTimeZone: string;
}

/**
 * The next-run schedule after one discovery run. `emptyRuns` is the streak before this run. A weekly
 * search goes to its next pinned day whatever the yield; `emptyRuns` is still tracked for the UI.
 */
export function scheduleNextRun(
  emptyRuns: number,
  cadence: SearchCadence,
  run: ReportPilotSearchRunInput,
  now: Date,
) {
  const at = (ms: number) => new Date(now.getTime() + ms);
  const pinned = isPinnedWeekly(cadence)
    ? nextWeeklyRun(cadence.cadenceDays, cadence.cadenceHour, cadence.cadenceTimeZone, now)
    : null;
  const recorded = { lastRunAt: now, lastJobsSeen: run.jobsSeen, lastNewJobs: run.newJobs };

  if (run.newJobs === 0) {
    const rung = EMPTY_RUN_BACKOFF_MS[Math.min(emptyRuns, EMPTY_RUN_BACKOFF_MS.length - 1)];
    return { ...recorded, emptyRuns: emptyRuns + 1, nextRunAt: pinned ?? at(rung) };
  }
  const stillYielding = run.newJobs >= GOOD_RUN_NEW_JOBS && !run.reachedEnd;
  return {
    ...recorded,
    emptyRuns: 0,
    nextRunAt: pinned ?? at(stillYielding ? RERUN_GOOD_SEARCH_MS : RERUN_SLOW_SEARCH_MS),
  };
}

/** A weekly search's first due date, or null for an adaptive one, which is due as soon as saved. */
function firstPinnedRun(input: UpdatePilotSearchInput, now = new Date()): Date | null {
  if (input.cadence !== "weekly" || !input.cadenceDays?.length) return null;
  return nextWeeklyRun(
    input.cadenceDays,
    input.cadenceHour ?? 8,
    input.cadenceTimeZone ?? "UTC",
    now,
  );
}

/** Schedule columns for a create or patch; an omitted field stays Prisma's "unchanged". */
function cadenceData(input: UpdatePilotSearchInput) {
  return {
    cadence: input.cadence,
    cadenceDays: input.cadenceDays,
    cadenceHour: input.cadenceHour,
    cadenceTimeZone: input.cadenceTimeZone,
  };
}

/** The pilot's self-managed discovery searches. */
@singleton()
export class PilotSearchService {
  constructor(private readonly prisma: PrismaClient) {}

  private clearTaskList(userId: string) {
    return this.prisma.pilotState.updateMany({ where: { userId }, data: TASK_LIST_SNAPSHOT_RESET });
  }

  /**
   * A DB unique would treat two NULL boards as distinct, and a COALESCE index reads as schema drift
   * to Prisma. The pilot is the only writer, so losing a race costs a duplicate, not corruption.
   */
  private async assertUnique(
    userId: string,
    query: string,
    board: string | null,
    exceptId?: string,
  ) {
    const clash = await this.prisma.pilotSearch.findFirst({
      where: { userId, query, board, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    if (clash) throw conflict("A search with this query and board already exists.");
  }

  private findOwnedSearch(userId: string, id: string) {
    return findOwned(
      (where) =>
        this.prisma.pilotSearch.findFirst({
          where,
          select: {
            query: true,
            board: true,
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
  }

  list(userId: string) {
    return this.prisma.pilotSearch.findMany({ where: { userId }, orderBy: { nextRunAt: "asc" } });
  }

  async create(userId: string, input: CreatePilotSearchInput) {
    const board = input.board ?? null;
    await this.assertUnique(userId, input.query, board);
    const firstRun = firstPinnedRun(input);
    const row = await this.prisma.pilotSearch.create({
      data: {
        userId,
        query: input.query,
        board,
        resumeId: input.resumeId ?? null,
        reason: input.reason,
        minScore: input.minScore ?? null,
        maxApplications: input.maxApplications ?? null,
        ...cadenceData(input),
        ...(firstRun ? { nextRunAt: firstRun } : {}),
      },
    });
    if (input.campaignId) await this.adoptCampaign(userId, input.campaignId, row.id);
    await this.clearTaskList(userId);
    return row;
  }

  /**
   * Points the campaign being repeated at its new search, so discovery reuses it instead of opening
   * a duplicate. `updateMany` is the ownership guard: another user's campaign matches nothing.
   */
  private adoptCampaign(userId: string, campaignId: string, searchId: string) {
    return this.prisma.campaign.updateMany({
      where: { campaignId, userId, pilotSearchId: null },
      data: { pilotSearchId: searchId },
    });
  }

  async update(userId: string, id: string, input: UpdatePilotSearchInput) {
    const existing = await this.findOwnedSearch(userId, id);
    const query = input.query ?? existing.query;
    const board = input.board === undefined ? existing.board : input.board;
    // A different query or board is a different search, so its schedule starts over.
    const isNewSearch = query !== existing.query || board !== existing.board;
    if (isNewSearch) await this.assertUnique(userId, query, board, id);

    const pin = firstPinnedRun({
      cadence: input.cadence ?? existing.cadence,
      cadenceDays: input.cadenceDays ?? existing.cadenceDays,
      cadenceHour: input.cadenceHour ?? existing.cadenceHour,
      cadenceTimeZone: input.cadenceTimeZone ?? existing.cadenceTimeZone,
    });
    const scheduleEdited = Object.values(cadenceData(input)).some((value) => value !== undefined);

    const row = await this.prisma.pilotSearch.update({
      where: { id },
      data: {
        query: input.query,
        board: input.board,
        resumeId: input.resumeId,
        reason: input.reason,
        minScore: input.minScore,
        maxApplications: input.maxApplications,
        ...cadenceData(input),
        // Editing the schedule re-aims the next run; leaving it alone must not move the date.
        ...(scheduleEdited && pin ? { nextRunAt: pin } : {}),
        // Restarting "from now" would drag a pinned search onto whatever day this edit is.
        ...(isNewSearch
          ? {
              emptyRuns: 0,
              lastJobsSeen: null,
              lastNewJobs: null,
              ...(pin ? {} : { nextRunAt: new Date() }),
            }
          : {}),
      },
    });
    await this.clearTaskList(userId);
    return row;
  }

  async remove(userId: string, id: string) {
    await this.findOwnedSearch(userId, id);
    await this.prisma.pilotSearch.delete({ where: { id } });
    await this.clearTaskList(userId);
    return { deleted: id };
  }

  async reportRun(userId: string, id: string, input: ReportPilotSearchRunInput) {
    const existing = await this.findOwnedSearch(userId, id);
    const row = await this.prisma.pilotSearch.update({
      where: { id },
      data: scheduleNextRun(existing.emptyRuns, existing, input, new Date()),
    });
    await this.clearTaskList(userId);
    return row;
  }
}
