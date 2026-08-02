"use client";

import { DEFAULT_CURSOR_PAGE_SIZE } from "@jobpilot/contracts/pagination";
import type {
  PilotJournalEntry,
  PilotJournalKind,
  PilotJournalPage,
} from "@jobpilot/contracts/pilot";
import { pilotChannel } from "@jobpilot/contracts/sse";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { queryKeys } from "@/api/query-keys";
import { type SseConnectionStatus, useSseChannel } from "@/lib/sse/client";
import { dedupeById } from "@/utils/array";

/** Cap the live buffer so a long-lived session doesn't grow unbounded; oldest (tail) drop first. */
const LIVE_CAP = 100;

/** Roomy enough that the fetched page's tail (where `nextCursor` resumes) survives live prepends. */
const CACHE_CAP = DEFAULT_CURSOR_PAGE_SIZE + LIVE_CAP;

/**
 * One buffer for every caller: the overview strip, the stage hook, and the feed all
 * mount concurrently, so per-hook state would fan the same event into N copies.
 */
let buffer: PilotJournalEntry[] = [];
const listeners = new Set<() => void>();

/** Each subscriber's SSE handler fires for the same event, so appends must be idempotent. */
function appendEntry(entry: PilotJournalEntry): void {
  if (buffer.some((e) => e.id === entry.id)) {
    return;
  }
  buffer = [entry, ...buffer].slice(0, LIVE_CAP);
  for (const listener of listeners) {
    listener();
  }
}

/** Empties the buffer after a pilot reset, so streamed entries don't outlive the rows they mirror. */
export function clearLiveJournal(): void {
  buffer = [];
  for (const listener of listeners) {
    listener();
  }
}

/** Journal caches are keyed by their kind filter, and an unfiltered one takes every kind. */
function takesKind(queryKey: readonly unknown[], kind: PilotJournalKind): boolean {
  const { kinds } = (queryKey.at(-1) ?? {}) as { kinds?: PilotJournalKind[] };
  return !kinds?.length || kinds.includes(kind);
}

function subscribeToBuffer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const EMPTY: PilotJournalEntry[] = [];

/** SSE delivers raw JSON, so `createdAt` arrives as an ISO string, not a revived Date. */
function fromEvent(entry: unknown): PilotJournalEntry {
  const raw = entry as PilotJournalEntry & { createdAt: string };
  return { ...raw, createdAt: new Date(raw.createdAt) };
}

/** Feeds the shared buffer; every caller registers it, so appends and write-throughs are idempotent. */
function useJournalStream(): SseConnectionStatus {
  const queryClient = useQueryClient();

  return useSseChannel(pilotChannel, null, {
    on: {
      "journal.appended": (event) => {
        const entry = fromEvent(event.entry);
        appendEntry(entry);
        // Write through: this buffer dies with the tab, and the 30s staleTime would
        // serve a freshly mounted tab the pre-entry cached page.
        queryClient.setQueriesData<PilotJournalPage>(
          {
            queryKey: queryKeys.pilot.journalAll(),
            predicate: (query) => takesKind(query.queryKey, entry.kind),
          },
          (page) =>
            page && { ...page, items: dedupeById([entry, ...page.items]).slice(0, CACHE_CAP) },
        );
      },
    },
  });
}

interface JournalLive {
  /** Newest-first, streamed since mount. Merge with the fetched page via `dedupeById`. */
  entries: PilotJournalEntry[];
  status: SseConnectionStatus;
}

/** Live journal buffer shared by the Overview strip and the Activity feed. */
export function useJournalLive(): JournalLive {
  const status = useJournalStream();
  const entries = useSyncExternalStore(
    subscribeToBuffer,
    () => buffer,
    () => EMPTY,
  );

  return { entries, status };
}

/**
 * The newest streamed cycle entry, for callers that don't care about the rest of the journal.
 * `find` hands back the buffer's own element, so an unchanged result is reference-equal and
 * `useSyncExternalStore` skips the render - unlike a whole-buffer subscription.
 */
export function useLatestCycle(): PilotJournalEntry | null {
  useJournalStream();
  return useSyncExternalStore(
    subscribeToBuffer,
    () => buffer.find((entry) => entry.kind === "cycle") ?? null,
    () => null,
  );
}
