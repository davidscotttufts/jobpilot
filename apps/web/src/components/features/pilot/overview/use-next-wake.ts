"use client";

import { type PilotJournalEntry, pilotCycleDetailSchema } from "@jobpilot/contracts/pilot";
import { useEffect, useState } from "react";
import { useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import { useLatestCycle } from "../journal/use-journal-live";

const isCycle = (entry: PilotJournalEntry): boolean => entry.kind === "cycle";

/**
 * When the next cycle wakes: the newest cycle entry's completion plus the sleep it announced.
 * The agenda carries the same figure, but its query is pinned (compiling one is costly) and goes
 * stale; the journal cache + live SSE buffer are already on the page and stay current.
 */
export function useNextWake(): Date | null {
  const journal = useApiQuery(pilotQueries.journal());
  const streamed = useLatestCycle();

  const cycle = streamed ?? journal.data?.items.find(isCycle);
  const sleepSeconds = cycle && pilotCycleDetailSchema.safeParse(cycle.detail).data?.sleepSeconds;
  const wakeAt =
    cycle && sleepSeconds != null
      ? new Date(cycle.createdAt.getTime() + sleepSeconds * 1000)
      : null;

  // Nothing to refresh for a wake that already passed - callers render a static label from then on.
  const [, setTick] = useState(0);
  const wakeMs = wakeAt?.getTime() ?? null;

  useEffect(() => {
    if (wakeMs === null || wakeMs <= Date.now()) {
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [wakeMs]);

  return wakeAt;
}
