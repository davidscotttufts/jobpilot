import {
  type CreatePilotJournalInput,
  type PilotJournalEntry,
  type PilotJournalRun,
  pilotCycleDetailSchema,
} from "@jobpilot/contracts/pilot";
import { pilotChannel } from "@jobpilot/contracts/sse";
import { z } from "zod/v4";
import type {
  PilotJournalEntry as PilotJournalEntryModel,
  Prisma,
} from "@/generated/prisma/client";
import { toInputJson } from "./json";
import { publish } from "./sse";

type ActivityTransaction = Pick<Prisma.TransactionClient, "pilotJournalEntry" | "pilotState">;

export type RunsByCycle = ReadonlyMap<string, PilotJournalRun>;

const NO_RUNS: RunsByCycle = new Map();

/** Validates and maps a stored activity row to its wire DTO. */
export function toActivityEntry(
  row: PilotJournalEntryModel,
  runs: RunsByCycle = NO_RUNS,
): PilotJournalEntry {
  const run = row.cycleId ? (runs.get(row.cycleId) ?? null) : null;
  return { ...row, detail: z.record(z.string(), z.json()).parse(row.detail), run };
}

/** Writes activity entries with cycle accounting inside the caller's transaction. */
export async function writeActivity(
  tx: ActivityTransaction,
  userId: string,
  body: CreatePilotJournalInput,
  now = new Date(),
): Promise<PilotJournalEntryModel[]> {
  const rows: PilotJournalEntryModel[] = body.entries.map((entry) => ({
    id: crypto.randomUUID(),
    userId,
    cycleId: body.cycleId ?? null,
    kind: entry.kind,
    summary: entry.summary,
    detail: entry.detail ?? {},
    subjectType: entry.subjectType ?? null,
    subjectId: entry.subjectId ?? null,
    createdAt: now,
  }));
  await tx.pilotJournalEntry.createMany({
    data: rows.map((row) => ({ ...row, detail: toInputJson(row.detail) })),
  });
  const cycles = rows.filter((entry) => entry.kind === "cycle");
  const last = cycles.at(-1);
  if (last) {
    // Stuck-recovery cycles journal no sleep, so they leave no wake planned.
    const sleepSeconds = pilotCycleDetailSchema.safeParse(last.detail).data?.sleepSeconds;
    const nextWakeAt =
      sleepSeconds === undefined ? null : new Date(now.getTime() + sleepSeconds * 1000);
    await tx.pilotState.upsert({
      where: { userId },
      create: { userId, lastCycleAt: now, cycleCount: cycles.length, nextWakeAt },
      update: { lastCycleAt: now, cycleCount: { increment: cycles.length }, nextWakeAt },
    });
  }
  return rows;
}

/** Publishes committed activity rows and returns their wire DTOs. */
export function publishActivity(
  userId: string,
  rows: PilotJournalEntryModel[],
  runs: RunsByCycle = NO_RUNS,
): PilotJournalEntry[] {
  const items = rows.map((row) => toActivityEntry(row, runs));
  for (const entry of items) {
    publish(pilotChannel, { userId }, { type: "journal.appended", entry });
  }
  return items;
}
