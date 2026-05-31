import { db } from "@/lib/db";
import { RUN_JOB_TERMINAL_OUTCOMES } from "@/lib/schemas/run";
import type { PipelineColumnPage, PipelineJobDto, PipelineStage } from "@/types/api/pipeline";
import { mapApplication, mapQueueEntry, mapRunJob } from "./mappers";
import type { PipelineFilters } from "./params";

export function emptyPage(stage: PipelineStage): PipelineColumnPage {
  return { stage, items: [], nextCursor: null, total: 0, todayCount: 0 };
}

export async function loadQueued(
  profileId: number,
  cursor: number | null,
  limit: number,
  filters: PipelineFilters,
): Promise<PipelineColumnPage> {
  // Queued entries live in QueueEntry, which has no runId — a run scope can
  // never match them, so short-circuit (mirrors the board handling).
  if (filters.board || filters.runId) {
    return emptyPage("queued");
  }

  const baseWhere = { profileId, status: "pending" } as const;
  const searchWhere = filters.search
    ? {
        OR: [{ url: { contains: filters.search } }, { note: { contains: filters.search } }],
      }
    : {};

  const [items, total, todayCount] = await Promise.all([
    db.queueEntry.findMany({
      where: { ...baseWhere, ...withCursor(cursor), ...searchWhere },
      orderBy: { id: "desc" },
      take: limit + 1,
    }),
    db.queueEntry.count({ where: baseWhere }),
    db.queueEntry.count({ where: { ...baseWhere, createdAt: { gte: startOfToday() } } }),
  ]);

  return finalize("queued", items, total, todayCount, limit, mapQueueEntry);
}

export async function loadApplying(
  profileId: number,
  cursor: number | null,
  limit: number,
  filters: PipelineFilters,
): Promise<PipelineColumnPage> {
  const baseWhere = {
    run: { status: "in_progress", profileId },
    status: { notIn: [...RUN_JOB_TERMINAL_OUTCOMES] },
    ...(filters.board ? { board: filters.board } : {}),
    ...(filters.runId ? { runId: filters.runId } : {}),
  };
  const searchWhere = filters.search
    ? {
        OR: [{ title: { contains: filters.search } }, { company: { contains: filters.search } }],
      }
    : {};

  const [items, total, todayCount] = await Promise.all([
    db.job.findMany({
      where: { ...baseWhere, ...withCursor(cursor), ...searchWhere },
      orderBy: { id: "desc" },
      take: limit + 1,
    }),
    db.job.count({ where: baseWhere }),
    db.job.count({ where: { ...baseWhere, appliedAt: { gte: startOfToday() } } }),
  ]);

  return finalize("applying", items, total, todayCount, limit, mapRunJob);
}

export function loadSubmitted(
  profileId: number,
  cursor: number | null,
  limit: number,
  filters: PipelineFilters,
): Promise<PipelineColumnPage> {
  return loadApplicationStage(profileId, "submitted", "applied", cursor, limit, filters, {
    extraSearchFields: ["url"],
  });
}

export function loadInterviewing(
  profileId: number,
  cursor: number | null,
  limit: number,
  filters: PipelineFilters,
): Promise<PipelineColumnPage> {
  return loadApplicationStage(
    profileId,
    "interviewing",
    { notIn: ["applied", "rejected", "withdrawn"] },
    cursor,
    limit,
    filters,
  );
}

type ApplicationStageFilter = string | { notIn: string[] };

async function loadApplicationStage(
  profileId: number,
  stage: PipelineStage,
  stageFilter: ApplicationStageFilter,
  cursor: number | null,
  limit: number,
  filters: PipelineFilters,
  opts: { extraSearchFields?: "url"[] } = {},
): Promise<PipelineColumnPage> {
  const baseWhere = {
    profileId,
    stage: stageFilter,
    ...(filters.board ? { board: filters.board } : {}),
    ...(filters.runId ? { runId: filters.runId } : {}),
  };
  const searchWhere = filters.search
    ? {
        OR: [
          { title: { contains: filters.search } },
          { company: { contains: filters.search } },
          ...(opts.extraSearchFields?.includes("url")
            ? [{ url: { contains: filters.search } }]
            : []),
        ],
      }
    : {};

  const [items, total, todayCount] = await Promise.all([
    db.application.findMany({
      where: { ...baseWhere, ...withCursor(cursor), ...searchWhere },
      orderBy: { id: "desc" },
      take: limit + 1,
    }),
    db.application.count({ where: baseWhere }),
    db.application.count({ where: { ...baseWhere, appliedAt: { gte: startOfToday() } } }),
  ]);

  return finalize(stage, items, total, todayCount, limit, (a) => mapApplication(a, stage));
}

function withCursor(cursor: number | null) {
  return cursor ? { id: { lt: cursor } } : {};
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function finalize<T extends { id: number }>(
  stage: PipelineStage,
  items: T[],
  total: number,
  todayCount: number,
  limit: number,
  map: (item: T) => PipelineJobDto,
): PipelineColumnPage {
  const hasNext = items.length > limit;
  const page = hasNext ? items.slice(0, limit) : items;
  return {
    stage,
    items: page.map(map),
    nextCursor: hasNext ? String(page[page.length - 1]!.id) : null,
    total,
    todayCount,
  };
}
